import React, { useState, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  ShieldCheck,
  Flame,
  Volume2,
  FileText,
  Download,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Sparkles,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SpecSheetModal, { SpecMaterial } from "./SpecSheetModal";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  CATALOG_ITEMS,
  CatalogItem,
  DIVISIONS,
  CARBON_FILTERS,
} from "@/data/materials";

export type { CatalogItem };

export const MaterialCatalogExplorer: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("All");
  const [selectedCarbonFilter, setSelectedCarbonFilter] = useState("all");
  const [selectedMaterialForSpec, setSelectedMaterialForSpec] = useState<SpecMaterial | null>(null);
  const [specModalOpen, setSpecModalOpen] = useState(false);

  const filteredItems = useMemo(() => {
    return CATALOG_ITEMS.filter((item) => {
      // Search matching
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.division.toLowerCase().includes(query) ||
        item.application.toLowerCase().includes(query) ||
        item.provenance.toLowerCase().includes(query);

      // Division matching
      const matchesDivision =
        selectedDivision === "All" || item.division === selectedDivision;

      // Carbon profile matching
      const matchesCarbon =
        selectedCarbonFilter === "all" ||
        item.carbonCategory === selectedCarbonFilter;

      return matchesSearch && matchesDivision && matchesCarbon;
    });
  }, [searchQuery, selectedDivision, selectedCarbonFilter]);

  const handleOpenSpec = (item: CatalogItem) => {
    setSelectedMaterialForSpec(item);
    setSpecModalOpen(true);
  };

  const handleQuickCopyParam = (item: CatalogItem) => {
    const payload = JSON.stringify(
      {
        materialCode: item.code,
        materialName: item.name,
        embodiedCarbon_A1A3: `${item.embodiedCarbon} kgCO2e/m2`,
        fireRating: item.fireRating,
        density: item.density,
        conductivity: item.conductivity,
        complianceStandard: "ISO 14044 / EN 15804",
      },
      null,
      2
    );
    navigator.clipboard.writeText(payload);
    toast("IFC4 PARAMETER COPIED", {
      description: `${item.name} attributes copied to clipboard for CAD parameter import.`,
      duration: 3500,
    });
  };

  return (
    <section id="specimen-catalog" className="py-24 bg-[#141412] border-t border-[#EAE7DF]/15 relative">
      <div className="container mx-auto px-4 md:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-sans uppercase tracking-widest text-[#C85A32] font-semibold">
            Repository
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal text-[#F6F5F0] mt-2">
            Tactile Specimen Catalog
          </h2>
          <p className="mt-3 text-base text-[#EAE7DF]/75 font-sans leading-relaxed">
            Verified low-carbon architectural assemblies with cradle-to-gate LCA metrics, fire ratings, and 3-part CSI specifications.
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="max-w-6xl mx-auto mb-8 bg-[#1C1B18] p-5 md:p-6 rounded-2xl border border-[#EAE7DF]/15 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B8B19F]" />
              <Input
                placeholder="Search assembly, division, or quarry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#141412] border-white/10 text-[#F6F5F0] placeholder:text-[#B8B19F]/50 font-sans text-xs focus:border-[#C85A32] rounded-lg"
              />
            </div>

            {/* Carbon Intensity Filter */}
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {CARBON_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedCarbonFilter(f.id)}
                  className={`px-3 py-1.5 text-xs font-sans rounded-lg border transition-colors whitespace-nowrap ${
                    selectedCarbonFilter === f.id
                      ? "bg-[#C85A32] text-white border-[#C85A32] font-medium"
                      : "bg-[#141412] text-[#B8B19F] border-white/5 hover:border-white/15"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Division Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-3 border-t border-white/5 no-scrollbar">
            {DIVISIONS.map((div) => (
              <button
                key={div}
                onClick={() => setSelectedDivision(div)}
                className={`px-3 py-1 text-xs font-sans rounded-md transition-colors whitespace-nowrap ${
                  selectedDivision === div
                    ? "bg-[#2E6F5E] text-white font-medium"
                    : "text-[#B8B19F] hover:bg-white/5 hover:text-white"
                }`}
              >
                {div}
              </button>
            ))}
          </div>
        </div>

        {/* Results Counter */}
        <div className="max-w-6xl mx-auto mb-4 flex justify-between items-center text-xs font-sans text-[#B8B19F] px-2">
          <span>
            Showing <strong className="text-[#F6F5F0]">{filteredItems.length}</strong> of {CATALOG_ITEMS.length} assemblies
          </span>
          {(searchQuery || selectedDivision !== "All" || selectedCarbonFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedDivision("All");
                setSelectedCarbonFilter("all");
              }}
              className="text-[#C85A32] hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Specimen Table (Desktop) / Cards (Mobile) */}
        <div className="max-w-6xl mx-auto">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-[#EAE7DF]/15 bg-[#1C1B18] shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-[#141412] text-xs font-sans text-[#B8B19F]">
                  <th className="py-4 px-5">Specimen &amp; CSI Code</th>
                  <th className="py-4 px-4">Division</th>
                  <th className="py-4 px-4">A1–A3 Carbon</th>
                  <th className="py-4 px-4">Fire Rating</th>
                  <th className="py-4 px-4">Conductivity</th>
                  <th className="py-4 px-4">EPD</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-sans">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Name & Code */}
                    <td className="py-4 px-5">
                      <div className="font-serif font-normal text-sm text-[#F6F5F0] group-hover:text-[#C85A32] transition-colors">
                        {item.name}
                      </div>
                      <div className="text-[11px] font-mono text-[#B8B19F]/70 mt-0.5">
                        {item.code}
                      </div>
                    </td>

                    {/* Division */}
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#141412] text-[#EAE7DF] border border-white/5">
                        {item.divisionCode}
                      </span>
                    </td>

                    {/* Embodied Carbon */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 font-sans font-semibold">
                        <span
                          className={`text-sm ${
                            item.embodiedCarbon < 0
                              ? "text-[#2E6F5E]"
                              : item.embodiedCarbon <= 40
                              ? "text-[#4A9A84]"
                              : "text-[#C85A32]"
                          }`}
                        >
                          {item.embodiedCarbon > 0 ? `+${item.embodiedCarbon}` : item.embodiedCarbon}
                        </span>
                        <span className="text-[11px] text-[#B8B19F] font-normal">kgCO₂e/m²</span>
                      </div>
                    </td>

                    {/* Fire Rating */}
                    <td className="py-4 px-4">
                      <div className="text-xs text-[#EAE7DF] flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-[#C85A32]" />
                        <span>{item.fireRating.split("(")[0].trim()}</span>
                      </div>
                    </td>

                    {/* Conductivity */}
                    <td className="py-4 px-4 font-mono text-xs text-[#B8B19F]">
                      {item.conductivity}
                    </td>

                    {/* EPD Status */}
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#2E6F5E] font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" /> Type III
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleQuickCopyParam(item)}
                          className="h-8 px-2.5 text-[#B8B19F] hover:text-[#F6F5F0] hover:bg-white/5 text-xs font-sans"
                          title="Copy IFC4 parameter snippet"
                        >
                          IFC4
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="h-8 bg-white text-[#C85A32] hover:bg-[#181816] hover:text-white hover:border-[#EAE7DF]/30 border border-[#C85A32]/30 text-xs font-sans font-medium px-2.5 rounded-lg transition-all"
                          title="Load specimen into STRATA Workbench"
                        >
                          <Link to={`/workbench?material=${item.id}`}>
                            <Layers className="w-3.5 h-3.5 mr-1" />
                            Workbench
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleOpenSpec(item)}
                          className="h-8 bg-[#C85A32] hover:bg-[#A64522] text-white text-xs font-sans font-medium px-3 rounded-lg"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          Inspect
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-6 rounded-2xl bg-[#1C1B18] border border-[#EAE7DF]/15 space-y-3 shadow-lg"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[11px] font-mono text-[#B8B19F] block">
                      {item.code}
                    </span>
                    <h3 className="font-serif font-normal text-base text-[#F6F5F0] mt-0.5">
                      {item.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-base font-sans font-bold block ${
                        item.embodiedCarbon < 0
                          ? "text-[#2E6F5E]"
                          : item.embodiedCarbon <= 40
                          ? "text-[#4A9A84]"
                          : "text-[#C85A32]"
                      }`}
                    >
                      {item.embodiedCarbon > 0 ? `+${item.embodiedCarbon}` : item.embodiedCarbon}
                    </span>
                    <span className="text-[10px] text-[#B8B19F]">kgCO₂e/m²</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs font-sans">
                  <div>
                    <span className="text-[10px] text-[#B8B19F] block">DIVISION</span>
                    <span className="text-[#EAE7DF]">{item.division}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#B8B19F] block">FIRE RATING</span>
                    <span className="text-[#EAE7DF]">{item.fireRating.split("(")[0].trim()}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="flex-1 bg-white text-[#C85A32] hover:bg-[#181816] hover:text-white hover:border-[#EAE7DF]/30 border border-[#C85A32]/30 font-sans text-xs font-medium transition-all"
                  >
                    <Link to={`/workbench?material=${item.id}`}>
                      <Layers className="w-3.5 h-3.5 mr-1" />
                      Workbench
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleOpenSpec(item)}
                    className="flex-1 bg-[#C85A32] hover:bg-[#A64522] text-white font-sans text-xs font-medium"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    Inspect Spec
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-16 bg-[#1C1B18] rounded-2xl border border-[#EAE7DF]/15 p-6">
              <p className="text-base text-[#EAE7DF] font-serif">No assemblies match your filters.</p>
              <Button
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedDivision("All");
                  setSelectedCarbonFilter("all");
                }}
                className="mt-4 bg-[#C85A32] text-white font-sans text-xs"
              >
                Reset Filters
              </Button>
            </div>
          )}
        </div>

      </div>

      {/* CSI Spec Sheet Modal */}
      <SpecSheetModal
        open={specModalOpen}
        onOpenChange={setSpecModalOpen}
        material={selectedMaterialForSpec}
      />
    </section>
  );
};

export default MaterialCatalogExplorer;
