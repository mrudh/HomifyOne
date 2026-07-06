const Plot = require('../models/Plot');
const Selection = require('../models/Selection');
const PurchaseOrder = require('../models/PurchaseOrder');

exports.getPendingSelections = async (req, res, next) => {
  try {
    const plots = await Plot.find({ developer: req.user._id, status: 'selections_submitted' })
      .populate('buyer', 'name email phone');

    const results = await Promise.all(plots.map(async (plot) => {
      const selections = await Selection.find({ plot: plot._id }).populate('products');
      const allProducts = selections.flatMap(s => s.products.map(p => ({ ...p.toObject(), room: s.room, category: s.category })));
      const total = allProducts.reduce((sum, p) => sum + (p.price || 0), 0);
      return {
        plotId: plot._id,
        plotNumber: plot.plotNumber,
        development: plot.development,
        buyer: plot.buyer,
        itemCount: allProducts.length,
        total,
        submittedAt: plot.updatedAt,
      };
    }));

    res.status(200).json({ success: true, orders: results });
  } catch (err) { next(err); }
};

exports.getOrderDetail = async (req, res, next) => {
  try {
    const plot = await Plot.findOne({ _id: req.params.plotId, developer: req.user._id })
      .populate('buyer', 'name email phone');
    if (!plot) return res.status(404).json({ success: false, message: 'Plot not found.' });

    const order = await Order.findOne({ plot: plot._id }).sort({ createdAt: -1 });
    if (!order) return res.status(404).json({ success: false, message: 'No submitted order found for this plot.' });

    const total = order.pricing?.finalTotal ?? order.items.reduce((sum, i) => sum + (i.price || 0), 0);

    res.status(200).json({ success: true, plot, items: order.items, total, orderId: order._id, pricing: order.pricing });
  } catch (err) { next(err); }
};

exports.approveOrder = async (req, res, next) => {
  try {
    const plot = await Plot.findOne({ _id: req.params.plotId, developer: req.user._id });
    if (!plot) return res.status(404).json({ success: false, message: 'Plot not found.' });

    const selections = await Selection.find({ plot: plot._id }).populate('products');
    const items = selections.flatMap(s => s.products.map(p => ({ ...p.toObject(), room: s.room, category: s.category })));

    const grouped = items.reduce((acc, item) => {
      const key = item.supplier?.toString() || 'unassigned';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    const purchaseOrders = await Promise.all(
      Object.entries(grouped)
        .filter(([supplierId]) => supplierId !== 'unassigned')
        .map(([supplierId, groupItems]) =>
          PurchaseOrder.create({
            plot: plot._id,
            developer: req.user._id,
            supplier: supplierId,
            items: groupItems.map(i => ({
              product: i._id, name: i.name, price: i.price, room: i.room, category: i.category,
            })),
            totalCost: groupItems.reduce((sum, i) => sum + (i.price || 0), 0),
          })
        )
    );

    plot.status = 'selections_approved';
    plot.rejectionReason = null;
    await plot.save();

    res.status(200).json({ success: true, message: 'Order approved and purchase orders generated.', purchaseOrders });
  } catch (err) { next(err); }
};

exports.rejectOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) return res.status(400).json({ success: false, message: 'A rejection reason is required.' });

    const plot = await Plot.findOne({ _id: req.params.plotId, developer: req.user._id });
    if (!plot) return res.status(404).json({ success: false, message: 'Plot not found.' });

    plot.status = 'selections_rejected';
    plot.rejectionReason = reason.trim();
    await plot.save();

    res.status(200).json({ success: true, message: 'Order rejected.', plot });
  } catch (err) { next(err); }
};