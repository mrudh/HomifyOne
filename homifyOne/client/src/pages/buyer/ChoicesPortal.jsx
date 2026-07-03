import { useEffect, useState, useRef } from "react";
import api from "../../services/api";
import ProductCard from "./ProductCard";
import ProductModal from "./ProductModal";
import CompareDrawer from "./CompareDrawer";
import { useLocation } from "react-router-dom";

const ROOM_ICONS = {
  Kitchen: "🍳",
  "Living Room": "🛋️",
  Bedroom: "🛏️",
  Bathroom: "🚿",
  Flooring: "🪵",
  Wardrobes: "🚪",
  Lighting: "💡",
  Garden: "🌿",
};

export default function ChoicesPortal() {
  const location = useLocation();
  const [grouped, setGrouped] = useState({});
  const [selections, setSelections] = useState({});
  const [activeRoom, setActiveRoom] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [modalProduct, setModalProduct] = useState(null);
  const [compareList, setCompareList] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCats, setFilterCats] = useState([]);
  const [saving, setSaving] = useState(false);
  const filterRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PRODUCTS_PER_PAGE = 12;

  useEffect(() => {
    api.get("/products/grouped").then((r) => {
      setGrouped(r.data.grouped);
    });
    api.get("/selections").then((r) => {
      const map = {};
      r.data.selections.forEach((s) => {
        map[`${s.room}||${s.category}`] = s.products.map((p) => String(p._id));
      });
      setSelections(map);
    });
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target))
        setFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (Object.keys(grouped).length === 0) return;
    const targetRoom = location.state?.room;
    const firstRoom = Object.keys(grouped)[0];
    const roomToUse =
      targetRoom && grouped[targetRoom] ? targetRoom : firstRoom;

    setActiveRoom(roomToUse);
    setActiveCategory(Object.keys(grouped[roomToUse] || {})[0] || "");
  }, [location.state, grouped]);

  useEffect(() => {
    if (activeRoom) {
      setFilterCats([]);
      setCurrentPage(1);
    }
  }, [activeRoom]);

  const handleToggleSelect = async (room, category, productId) => {
    const key = `${room}||${category}`;
    const id = String(productId);
    const current = selections[key] || [];
    const isSelected = current.includes(id);
    const updated = isSelected
      ? current.filter((x) => x !== id)
      : [...current, id];

    setSelections((prev) => ({ ...prev, [key]: updated }));
    setSaving(true);
    await api.post("/selections", {
      room,
      category,
      productId: id,
      action: isSelected ? "remove" : "add",
    });
    setSaving(false);
  };

  const toggleCompare = (product) => {
    setCompareList((prev) => {
      if (prev.find((p) => p._id === product._id))
        return prev.filter((p) => p._id !== product._id);
      if (prev.length >= 3) return prev;
      return [...prev, product];
    });
  };

  const handleCloseCompare = () => {
    setShowCompare(false);
    setCompareList([]);
  };

  const allCategoryProducts = Object.values(grouped[activeRoom] || {}).flat();

  const availableSubCats = [
    ...new Set(
      Object.values(grouped[activeRoom] || {})
        .flat()
        .map((p) => p.subCategory)
    ),
  ].filter(Boolean);

  const filteredProducts = allCategoryProducts.filter((p) => {
    const catMatch =
      filterCats.length === 0 || filterCats.includes(p.subCategory);
    return catMatch;
  });

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  const rooms = Object.keys(grouped);
  const categories = grouped[activeRoom]
    ? Object.keys(grouped[activeRoom])
    : [];

  const findGroupedKeyForProduct = (product) => {
    const roomGroup = grouped[activeRoom] || {};
    const matchKey = Object.keys(roomGroup).find((key) =>
      roomGroup[key].some((p) => String(p._id) === String(product._id))
    );
    return matchKey || product.category;
  };

  // const isProductSelected = (product) => {
  //   const key = `${activeRoom}||${findGroupedKeyForProduct(product)}`;
  //   return (selections[key] || []).map(String).includes(String(product._id));
  // };

  const isProductSelected = (product) => {
    const idStr = String(product._id);
    return Object.entries(selections).some(
      ([key, ids]) => key.startsWith(`${activeRoom}||`) && ids.map(String).includes(idStr)
    );
  };

  // const roomSelectedCount = Object.entries(selections)
  //   .filter(([key]) => key.startsWith(`${activeRoom}||`))
  //   .reduce((sum, [, ids]) => sum + ids.length, 0);

  const totalSelectedCount = Object.values(selections)
  .reduce((sum, ids) => sum + ids.length, 0);

  const allProductsById = Object.values(grouped).flatMap(room => Object.values(room).flat())
    .reduce((map, p) => {
      map[String(p._id)] = p;
      return map;
    }, {});


  return (
    <div className="flex flex-col min-h-screen lg:h-full lg:overflow-hidden bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 pt-3 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {rooms.map((room) => (
            <button
              key={room}
              onClick={() => setActiveRoom(room)}
              className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-t-xl text-xs font-medium whitespace-nowrap transition border-b-2
                ${
                  activeRoom === room
                    ? "border-[#214f49] text-[#214f49] bg-[#eef7f5]"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
            >
              <span className="text-lg">{ROOM_ICONS[room] || "🏠"}</span>
              {room}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row lg:overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-32 lg:pb-24">
          <div className="flex flex-wrap items-start justify-between gap-3 px-4 md:px-8 pt-5 pb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                {activeRoom}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Choose your preferred finishes for your{" "}
                {activeRoom?.toLowerCase()}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-medium transition
                    ${
                      filterCats.length
                        ? "border-[#9ccdc4] text-[#214f49] bg-[#eef7f5]"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  <span>⚙️</span> Filter
                  {filterCats.length > 0 && (
                    <span className="bg-[#214f49] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {filterCats.length}
                    </span>
                  )}
                </button>

                {filterOpen && (
                  <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 w-56 p-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                      Filter by Category
                    </p>
                    {availableSubCats.map((sc) => (
                      <label
                        key={sc}
                        className="flex items-center gap-2 text-sm text-gray-700 mb-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filterCats.includes(sc)}
                          onChange={() => {
                            setFilterCats((prev) =>
                              prev.includes(sc)
                                ? prev.filter((x) => x !== sc)
                                : [...prev, sc]
                            );
                            setCurrentPage(1);
                          }}
                          className="rounded accent-[#2d6b62]"
                        />
                        {sc}
                      </label>
                    ))}
                    {availableSubCats.length === 0 && (
                      <p className="text-xs text-gray-400">
                        No categories available
                      </p>
                    )}
                    <button
                      onClick={() => setFilterCats([])}
                      className="mt-3 text-xs text-[#214f49] hover:underline w-full text-left font-medium"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => compareList.length >= 2 && setShowCompare(true)}
                disabled={compareList.length < 2}
                className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-medium transition
                  ${
                    compareList.length >= 2
                      ? "border-[#9ccdc4] text-[#214f49] bg-[#eef7f5] hover:bg-[#d8ebe7]"
                      : "border-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
              >
                ⚖️ Compare{" "}
                {compareList.length > 0 && `(${compareList.length}/3)`}
              </button>
            </div>
          </div>

          <div className="px-4 md:px-8 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedProducts.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                isSelected={isProductSelected(product)}
                isComparing={!!compareList.find((p) => p._id === product._id)}
                compareDisabled={
                  compareList.length >= 3 &&
                  !compareList.find((p) => p._id === product._id)
                }
                onSelect={() =>
                  handleToggleSelect(
                    activeRoom,
                    findGroupedKeyForProduct(product),
                    product._id
                  )
                }
                onZoom={() => setModalProduct(product)}
                onCompare={() => toggleCompare(product)}
              />
            ))}
            {filteredProducts.length === 0 && (
              <p className="text-gray-400 text-sm col-span-4 py-8 text-center">
                No products match your filters.
              </p>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 px-4 py-6">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-[#eef7f5] hover:text-[#214f49] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ← Prev
              </button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (page) =>
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1
                  )
                  .reduce((acc, page, idx, arr) => {
                    if (idx > 0 && page - arr[idx - 1] > 1) acc.push("...");
                    acc.push(page);
                    return acc;
                  }, [])
                  .map((page, idx) =>
                    page === "..." ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-2 py-2 text-gray-400 text-sm"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition
                            ${
                              currentPage === page
                                ? "bg-[#214f49] text-white"
                                : "border border-gray-200 text-gray-600 hover:bg-[#eef7f5] hover:text-[#214f49]"
                            }`}
                      >
                        {page}
                      </button>
                    )
                  )}
              </div>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-[#eef7f5] hover:text-[#214f49] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next →
              </button>
            </div>
          )}
        </main>
      </div>

      <div className="fixed bottom-0 right-0 left-0 lg:left-60 bg-white border-t border-gray-200 px-4 py-3 z-20 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              Current Selections
            </p>
            <p className="text-sm text-gray-700 mt-0.5">
              {totalSelectedCount > 0
                ? `${totalSelectedCount} item${totalSelectedCount > 1 ? 's' : ''} selected`
                : 'Nothing selected yet'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {saving && (
              <span className="text-xs text-amber-500 animate-pulse">
                Saving…
              </span>
            )}
            
            <button
              onClick={() => (window.location.href = "/buyer/basket")}
              className="bg-[#214f49] text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-[#2d6b62] transition"
            >
              View Basket
            </button>
          </div>
        </div>
      </div>

      {modalProduct && (
        <ProductModal
          product={modalProduct}
          isSelected={isProductSelected(modalProduct)}
          onSelect={() => {
            handleToggleSelect(
              activeRoom,
              findGroupedKeyForProduct(modalProduct),
              modalProduct._id
            );
            setModalProduct(null);
          }}
          onClose={() => setModalProduct(null)}
        />
      )}

      {showCompare && (
        <CompareDrawer
          products={compareList}
          selections={selections}
          activeRoom={activeRoom}
          activeCategory={activeCategory}
          onSelect={(id) => handleToggleSelect(activeRoom, activeCategory, id)}
          onClose={handleCloseCompare}
        />
      )}
    </div>
  );
}