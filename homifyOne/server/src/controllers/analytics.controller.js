const Plot = require('../models/Plot');
const Order = require('../models/Order');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const Selection = require('../models/Selection');
const User = require('../models/User');

const ROOM_DISPLAY_MERGE = {
  'master bedroom': 'Bedroom',
  'bedroom': 'Bedroom',
};

const normaliseRoomLabel = (room) => {
  const trimmed = (room || 'Unspecified').trim();
  const key = trimmed.toLowerCase();
  if (ROOM_DISPLAY_MERGE[key]) return ROOM_DISPLAY_MERGE[key];
  return trimmed || 'Unspecified';
};

const PLOT_STATUS_LABELS = {
  available: 'Available',
  assigned: 'Assigned',
  selections_submitted: 'Awaiting Review',
  selections_rejected: 'Changes Requested',
  selections_approved: 'Approved',
  completed: 'Completed',
};


const PLOT_STATUS_ORDER = ['available', 'assigned', 'selections_submitted', 'selections_rejected', 'selections_approved', 'completed'];

const monthsAgo = (n) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

const round = (n, dp = 1) => {
  if (n === null || n === undefined || Number.isNaN(n)) return 0;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

exports.getOverview = async (req, res, next) => {
  try {
    const since6mo = monthsAgo(5); 

    const [
      plotsByStatusRaw,
      totalPlots,
      overduePlots,

      ordersByStatusRaw,
      revenueAgg,
      revenueByMonthRaw,

      totalActiveProducts,
      avgPriceByCategoryRaw,
      productsByRoomRaw,
      topChosenCategoriesRaw,

      poTotals,
      poFulfilled,
      poTurnaroundAgg,
      bySupplierRaw,
      totalInvoices,
      flaggedInvoices,

      totalUsers,
      roleMixRaw,
      userGrowthRaw,
      totalSelections,
      completedQuestionnaires,
    ] = await Promise.all([
      Plot.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Plot.countDocuments({}),
      Plot.countDocuments({
        deadline: { $lt: new Date() },
        status: { $nin: ['completed', 'selections_approved'] },
      }),

      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$pricing.finalTotal' }, avg: { $avg: '$pricing.finalTotal' }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { status: 'approved', createdAt: { $gte: since6mo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$pricing.finalTotal' } } },
        { $sort: { _id: 1 } },
      ]),

      Product.countDocuments({ isActive: true }),
      Product.aggregate([
        { $match: { isActive: true, price: { $gt: 0 } } },
        { $group: { _id: '$category', avgPrice: { $avg: '$price' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$room', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      Order.aggregate([
        { $match: { status: 'approved' } },
        { $unwind: '$items' },
        { $group: { _id: '$items.category', timesChosen: { $sum: 1 } } },
        { $sort: { timesChosen: -1 } },
        { $limit: 8 },
      ]),

      PurchaseOrder.countDocuments({}),
      PurchaseOrder.countDocuments({ status: 'fulfilled' }),
      PurchaseOrder.aggregate([
        { $match: { acknowledgedAt: { $ne: null } } },
        { $project: { diffDays: { $divide: [{ $subtract: ['$acknowledgedAt', '$createdAt'] }, 1000 * 60 * 60 * 24] } } },
        { $group: { _id: null, avgDays: { $avg: '$diffDays' } } },
      ]),
      PurchaseOrder.aggregate([
        {
          $group: {
            _id: '$supplier',
            total: { $sum: 1 },
            fulfilled: { $sum: { $cond: [{ $eq: ['$status', 'fulfilled'] }, 1, 0] } },
            avgTurnaroundDays: {
              $avg: {
                $cond: [
                  { $ne: ['$acknowledgedAt', null] },
                  { $divide: [{ $subtract: ['$acknowledgedAt', '$createdAt'] }, 1000 * 60 * 60 * 24] },
                  null,
                ],
              },
            },
          },
        },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'supplierInfo' } },
        { $unwind: { path: '$supplierInfo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            supplier: { $ifNull: ['$supplierInfo.name', 'Unknown supplier'] },
            total: 1,
            fulfilled: 1,
            avgTurnaroundDays: 1,
          },
        },
        { $sort: { total: -1 } },
        { $limit: 6 },
      ]),
      Invoice.countDocuments({}),
      Invoice.countDocuments({ status: 'flagged' }),

      User.countDocuments({}),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      User.aggregate([
        { $match: { createdAt: { $gte: since6mo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Selection.countDocuments({}),
      Selection.countDocuments({ questionnaireCompleted: true }),
    ]);

  
    const plotCountByStatus = new Map(plotsByStatusRaw.map((r) => [r._id, r.count]));
    const plotsByStatus = PLOT_STATUS_ORDER.map((status) => ({
      status,
      label: PLOT_STATUS_LABELS[status] || status,
      count: plotCountByStatus.get(status) || 0,
    }));

    const ordersByStatus = ordersByStatusRaw.map((r) => ({ status: r._id, count: r.count }));
    const revenue = revenueAgg[0] || { total: 0, avg: 0, count: 0 };
    const revenueByMonth = revenueByMonthRaw.map((r) => ({ month: r._id, revenue: round(r.revenue, 2) }));

    const avgPriceByCategory = avgPriceByCategoryRaw.map((r) => ({
      category: r._id || 'Uncategorised',
      avgPrice: round(r.avgPrice, 2),
      count: r.count,
    }));
    const roomCounts = new Map();
    productsByRoomRaw.forEach((r) => {
      const label = normaliseRoomLabel(r._id);
      roomCounts.set(label, (roomCounts.get(label) || 0) + r.count);
    });
    const productsByRoom = Array.from(roomCounts.entries())
      .map(([room, count]) => ({ room, count }))
      .sort((a, b) => b.count - a.count);
    const topChosenCategories = topChosenCategoriesRaw.map((r) => ({
      category: r._id || 'Uncategorised',
      timesChosen: r.timesChosen,
    }));

    const bySupplier = bySupplierRaw
      .filter((r) => r._id)
      .map((r) => ({
        supplier: r.supplier,
        total: r.total,
        fulfilled: r.fulfilled,
        fulfillmentRate: r.total ? round((r.fulfilled / r.total) * 100, 0) : 0,
        avgTurnaroundDays: round(r.avgTurnaroundDays, 1),
      }));

    const roleMix = roleMixRaw.map((r) => ({ role: r._id, count: r.count }));
    const userGrowthByMonth = userGrowthRaw.map((r) => ({ month: r._id, count: r.count }));

    res.json({
      success: true,
      data: {
        plots: {
          total: totalPlots,
          byStatus: plotsByStatus,
          overdue: overduePlots,
        },
        orders: {
          byStatus: ordersByStatus,
          totalRevenue: round(revenue.total, 2),
          avgOrderValue: round(revenue.avg, 2),
          approvedCount: revenue.count,
          revenueByMonth,
        },
        products: {
          totalActive: totalActiveProducts,
          avgPriceByCategory,
          byRoom: productsByRoom,
          topChosenCategories,
        },
        suppliers: {
          totalPurchaseOrders: poTotals,
          fulfilledCount: poFulfilled,
          fulfillmentRate: poTotals ? round((poFulfilled / poTotals) * 100, 0) : 0,
          avgTurnaroundDays: round((poTurnaroundAgg[0] || {}).avgDays, 1),
          bySupplier,
          totalInvoices,
          flaggedInvoices,
          invoiceFlaggedRate: totalInvoices ? round((flaggedInvoices / totalInvoices) * 100, 0) : 0,
        },
        users: {
          total: totalUsers,
          roleMix,
          growthByMonth: userGrowthByMonth,
          totalSelections,
          questionnaireCompletionRate: totalSelections ? round((completedQuestionnaires / totalSelections) * 100, 0) : 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
