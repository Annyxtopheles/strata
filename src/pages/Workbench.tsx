import React, { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Layers,
  Database,
  ClipboardList,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  FileText,
  ShieldCheck,
  Flame,
  Volume2,
  Thermometer,
  GitCompare,
  Check,
  Search,
  RotateCcw,
  BookmarkPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { StrataLogo } from "@/components/StrataLogo";
import SpecSheetModal, { SpecMaterial } from "@/components/SpecSheetModal";
import {
  CATALOG_ITEMS,
  CatalogItem,
  DIVISIONS,
  CARBON_FILTERS,
} from "@/data/materials";
import { toast } from "sonner";

interface AssemblyLayer {
  uid: string;
  materialId: string;
  thicknessMm: number;
}

interface ScheduleEntry {
  uid: string;
  name: string;
  code: string;
  areaM2: number;
  carbonPerM2: number;
  baselinePerM2: number;
  rValue: number;
  uValue: number;
  fireRating: string;
  acousticNRC: number;
  layerSummary: string;
}

type WorkbenchTab = "composer" | "library" | "schedule";

interface AssemblyPreset {
  id: string;
  label: string;
  name: string;
  layers: { materialId: string; thicknessMm: number }[];
}

const ASSEMBLY_PRESETS: AssemblyPreset[] = [
  {
    id: "passive-envelope",
    label: "Hempcrete + Charred Cedar",
    name: "Breathable Passive Timber & Hempcrete Wall",
    layers: [
      { materialId: "spec-03", thicknessMm: 22 },
      { materialId: "spec-02", thicknessMm: 240 },
      { materialId: "spec-11", thicknessMm: 100 },
      { materialId: "spec-07", thicknessMm: 120 },
    ],
  },
  {
    id: "basalt-facade",
    label: "Basalt Geopolymer + Terracotta",
    name: "Terracotta Rainscreen & Geopolymer Shear Core",
    layers: [
      { materialId: "spec-09", thicknessMm: 42 },
      { materialId: "spec-08", thicknessMm: 80 },
      { materialId: "spec-01", thicknessMm: 200 },
    ],
  },
  {
    id: "acoustic-earth",
    label: "Mycelium + Compressed Earth",
    name: "Hygrothermal Acoustic Partition Assembly",
    layers: [
      { materialId: "spec-05", thicknessMm: 50 },
      { materialId: "spec-06", thicknessMm: 140 },
      { materialId: "spec-05", thicknessMm: 35 },
    ],
  },
];

const STORAGE_KEY_PROJECT = "strata_workbench_v1";

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const Workbench: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as WorkbenchTab) || "composer";

  const [activeTab, setActiveTab] = useState<WorkbenchTab>(
    ["composer", "library", "schedule"].includes(initialTab)
      ? initialTab
      : "composer"
  );

  const [projectName, setProjectName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROJECT);
      if (saved) return JSON.parse(saved).projectName || "Passive Civic Pavilion — Envelope Study";
    } catch {}
    return "Passive Civic Pavilion — Envelope Study";
  });

  const [assemblyName, setAssemblyName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROJECT);
      if (saved) return JSON.parse(saved).assemblyName || ASSEMBLY_PRESETS[0].name;
    } catch {}
    return ASSEMBLY_PRESETS[0].name;
  });

  const [envelopeAreaM2, setEnvelopeAreaM2] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROJECT);
      if (saved) return Number(JSON.parse(saved).envelopeAreaM2) || 2400;
    } catch {}
    return 2400;
  });

  const [layers, setLayers] = useState<AssemblyLayer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROJECT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.layers) && parsed.layers.length > 0) {
          return parsed.layers;
        }
      }
    } catch {}
    return ASSEMBLY_PRESETS[0].layers.map((l, idx) => ({
      uid: `layer-init-${idx}`,
      materialId: l.materialId,
      thicknessMm: l.thicknessMm,
    }));
  });

  const [schedule, setSchedule] = useState<ScheduleEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROJECT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.schedule)) return parsed.schedule;
      }
    } catch {}
    return [
      {
        uid: "sched-init-1",
        name: "Breathable Passive Timber & Hempcrete Wall",
        code: "STR-ASM-01",
        areaM2: 1850,
        carbonPerM2: -49.2,
        baselinePerM2: 424,
        rValue: 7.42,
        uValue: 0.13,
        fireRating: "EN 13501 Class B-s1,d0",
        acousticNRC: 0.88,
        layerSummary: "22mm Sugi Cedar + 240mm Hempcrete + 100mm Wool + 120mm Beech CLT",
      },
      {
        uid: "sched-init-2",
        name: "Pozzolanic Basalt Geopolymer Foundation Core",
        code: "03 30 00 / STR-CON-01",
        areaM2: 650,
        carbonPerM2: 82,
        baselinePerM2: 260,
        rValue: 1.45,
        uValue: 0.62,
        fireRating: "ASTM E84 Class A",
        acousticNRC: 0.12,
        layerSummary: "200mm Monolithic Basalt Geopolymer Matrix",
      },
    ];
  });

  const [selectedLayerUid, setSelectedLayerUid] = useState<string | null>(null);
  const [addMaterialId, setAddMaterialId] = useState<string>(CATALOG_ITEMS[0].id);

  // Library state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("All");
  const [selectedCarbonFilter, setSelectedCarbonFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"carbon" | "rvalue" | "acoustic">("carbon");
  const [compareIds, setCompareIds] = useState<string[]>(["spec-01", "spec-02"]);

  // Spec modal
  const [specModalOpen, setSpecModalOpen] = useState(false);
  const [specMaterial, setSpecMaterial] = useState<SpecMaterial | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_PROJECT,
        JSON.stringify({
          projectName,
          assemblyName,
          envelopeAreaM2,
          layers,
          schedule,
        })
      );
    } catch {}
  }, [projectName, assemblyName, envelopeAreaM2, layers, schedule]);

  // If ?preset=spec-XX is passed from landing page, load it into composer/modal
  useEffect(() => {
    const matId = searchParams.get("material");
    if (matId) {
      const found = CATALOG_ITEMS.find((m) => m.id === matId);
      if (found) {
        setLayers([
          {
            uid: `layer-param-${Date.now()}`,
            materialId: found.id,
            thicknessMm: found.defaultThicknessMm,
          },
        ]);
        setAssemblyName(`${found.name} Assembly`);
        setActiveTab("composer");
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, setSearchParams]);

  const handleTabChange = (tab: WorkbenchTab) => {
    setActiveTab(tab);
  };

  // Enrich layers with material specs and calculated metrics
  const resolvedLayers = useMemo(() => {
    return layers
      .map((layer) => {
        const mat = CATALOG_ITEMS.find((m) => m.id === layer.materialId);
        if (!mat) return null;
        const thicknessRatio = layer.thicknessMm / mat.defaultThicknessMm;
        const carbonContribution = mat.embodiedCarbon * thicknessRatio;
        const baselineContribution = mat.baselineCarbon * thicknessRatio;
        // R = thickness (m) / lambda
        const layerR = (layer.thicknessMm / 1000) / mat.lambdaValue;
        return {
          ...layer,
          material: mat,
          carbonContribution,
          baselineContribution,
          layerR,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [layers]);

  // Aggregate assembly physics
  const assemblyMetrics = useMemo(() => {
    const totalDepthMm = resolvedLayers.reduce((sum, l) => sum + l.thicknessMm, 0);
    const totalCarbonPerM2 = resolvedLayers.reduce((sum, l) => sum + l.carbonContribution, 0);
    const totalBaselinePerM2 = resolvedLayers.reduce((sum, l) => sum + l.baselineContribution, 0);
    const conductiveR = resolvedLayers.reduce((sum, l) => sum + l.layerR, 0);
    const totalR = conductiveR + 0.17; // Rsi (0.13) + Rse (0.04) ISO 6946 film resistances
    const uValue = totalR > 0 ? 1 / totalR : 0;
    const projectTonnes = (totalCarbonPerM2 * envelopeAreaM2) / 1000;
    const baselineTonnes = (totalBaselinePerM2 * envelopeAreaM2) / 1000;
    const savedTonnes = baselineTonnes - projectTonnes;
    const savedPct =
      totalBaselinePerM2 > 0
        ? Math.round(((totalBaselinePerM2 - totalCarbonPerM2) / totalBaselinePerM2) * 100)
        : 0;

    const maxNRC =
      resolvedLayers.length > 0
        ? Math.max(...resolvedLayers.map((l) => l.material.acousticNRC))
        : 0;
    const rwEstimate = Math.round(34 + totalDepthMm * 0.045 + maxNRC * 14);

    // Hygrothermal check: vapor tight outer layer over vapor permeable core?
    const hasPermeableCore = resolvedLayers.some((l) => l.material.vaporPermeable);
    const exteriorLayer = resolvedLayers[0];
    const vaporWarning =
      resolvedLayers.length > 1 &&
      hasPermeableCore &&
      exteriorLayer &&
      !exteriorLayer.material.vaporPermeable;

    // Governing fire class (check outermost face + interior)
    const allClassA = resolvedLayers.every((l) =>
      l.material.fireRating.includes("Class A") || l.material.fireRating.includes("ASTM E119")
    );
    const fireSummary =
      resolvedLayers.length === 0
        ? "—"
        : allClassA
        ? "ASTM E84 Class A / A1"
        : exteriorLayer?.material.fireRating.split(" (")[0] || "EN 13501 Class B";

    return {
      totalDepthMm,
      totalCarbonPerM2,
      totalBaselinePerM2,
      totalR,
      uValue,
      projectTonnes,
      savedTonnes,
      savedPct,
      maxNRC,
      rwEstimate,
      vaporWarning,
      fireSummary,
    };
  }, [resolvedLayers, envelopeAreaM2]);

  // Composer actions
  const applyPreset = (preset: AssemblyPreset) => {
    setAssemblyName(preset.name);
    setLayers(
      preset.layers.map((l, idx) => ({
        uid: `preset-${Date.now()}-${idx}`,
        materialId: l.materialId,
        thicknessMm: l.thicknessMm,
      }))
    );
    setSelectedLayerUid(null);
    toast("ASSEMBLY PRESET LOADED", {
      description: `${preset.name} loaded into cross-section composer.`,
    });
  };

  const addLayerToComposer = (materialId: string) => {
    const mat = CATALOG_ITEMS.find((m) => m.id === materialId);
    if (!mat) return;
    const newLayer: AssemblyLayer = {
      uid: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      materialId: mat.id,
      thicknessMm: mat.defaultThicknessMm,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerUid(newLayer.uid);
    toast("LAYER APPENDED", {
      description: `${mat.name} (${mat.defaultThicknessMm}mm) added to section stack.`,
    });
  };

  const updateLayerThickness = (uid: string, mm: number) => {
    const clamped = Math.max(5, Math.min(500, Math.round(mm) || 5));
    setLayers((prev) =>
      prev.map((l) => (l.uid === uid ? { ...l, thicknessMm: clamped } : l))
    );
  };

  const moveLayer = (uid: string, dir: -1 | 1) => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.uid === uid);
      if (idx < 0) return prev;
      const targetIdx = idx + dir;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      return copy;
    });
  };

  const removeLayer = (uid: string) => {
    setLayers((prev) => prev.filter((l) => l.uid !== uid));
    if (selectedLayerUid === uid) setSelectedLayerUid(null);
  };

  const saveAssemblyToSchedule = () => {
    if (resolvedLayers.length === 0) return;
    const entry: ScheduleEntry = {
      uid: `sched-${Date.now()}`,
      name: assemblyName.trim() || "Custom Envelope Assembly",
      code: `STR-ASM-${String(schedule.length + 1).padStart(2, "0")}`,
      areaM2: envelopeAreaM2,
      carbonPerM2: Number(assemblyMetrics.totalCarbonPerM2.toFixed(1)),
      baselinePerM2: Number(assemblyMetrics.totalBaselinePerM2.toFixed(1)),
      rValue: Number(assemblyMetrics.totalR.toFixed(2)),
      uValue: Number(assemblyMetrics.uValue.toFixed(2)),
      fireRating: assemblyMetrics.fireSummary,
      acousticNRC: Number(assemblyMetrics.maxNRC.toFixed(2)),
      layerSummary: resolvedLayers
        .map((l) => `${l.thicknessMm}mm ${l.material.name.split(" ")[0]}`)
        .join(" + "),
    };
    setSchedule((prev) => [entry, ...prev]);
    toast("SAVED TO PROJECT SCHEDULE", {
      description: `${entry.name} (${entry.areaM2} m²) pinned to WBLCA ledger.`,
    });
  };

  const inspectComposedSpec = () => {
    if (resolvedLayers.length === 0) return;
    const composedSpec: SpecMaterial = {
      id: "composed-assembly",
      code: `STR-ASM-${resolvedLayers.length}L`,
      name: assemblyName || "Custom Multi-Layer Assembly",
      subTitle: `${resolvedLayers.length}-layer envelope (${assemblyMetrics.totalDepthMm}mm total depth · U=${assemblyMetrics.uValue.toFixed(2)} W/m²K)`,
      embodiedCarbon: Math.round(assemblyMetrics.totalCarbonPerM2),
      benchmarkComparison: `${assemblyMetrics.savedPct}% delta vs conventional assembly (${Math.round(assemblyMetrics.totalBaselinePerM2)} kgCO₂e/m²)`,
      fireRating: assemblyMetrics.fireSummary,
      acousticNRC: Number(assemblyMetrics.maxNRC.toFixed(2)),
      rValue: Number(assemblyMetrics.totalR.toFixed(2)),
      tensileStrength: resolvedLayers[0].material.tensileStrength,
      leadTime: "Coordinated Multi-Trade Schedule",
      density: `${Math.round(resolvedLayers.reduce((s, l) => s + parseInt(l.material.density.replace(/,/g, ""), 10) * (l.thicknessMm / Math.max(1, assemblyMetrics.totalDepthMm)), 0)).toLocaleString()} kg/m³ avg`,
      epdVerified: true,
      provenance: resolvedLayers.map((l) => l.material.provenance).join(" · "),
      description: `Parametric ${resolvedLayers.length}-layer assembly engineered in STRATA Workbench with composite R-${assemblyMetrics.totalR.toFixed(2)} thermal resistance and estimated ${assemblyMetrics.rwEstimate} dB acoustic attenuation.`,
      layers: resolvedLayers.map((l) => ({
        name: l.material.name,
        depth: `${l.thicknessMm}mm`,
        hatchType: l.material.layers[0]?.hatchType || "concrete",
        color: l.material.layers[1]?.color || l.material.layers[0]?.color || "#C85A32",
      })),
    };
    setSpecMaterial(composedSpec);
    setSpecModalOpen(true);
  };

  // Library filtering & sorting
  const filteredCatalog = useMemo(() => {
    return CATALOG_ITEMS.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.division.toLowerCase().includes(q) ||
        item.provenance.toLowerCase().includes(q) ||
        item.application.toLowerCase().includes(q);
      const matchesDiv =
        selectedDivision === "All" || item.division === selectedDivision;
      const matchesCarbon =
        selectedCarbonFilter === "all" || item.carbonCategory === selectedCarbonFilter;
      return matchesSearch && matchesDiv && matchesCarbon;
    }).sort((a, b) => {
      if (sortBy === "carbon") return a.embodiedCarbon - b.embodiedCarbon;
      if (sortBy === "rvalue") return b.rValue - a.rValue;
      return b.acousticNRC - a.acousticNRC;
    });
  }, [searchQuery, selectedDivision, selectedCarbonFilter, sortBy]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) {
        toast("COMPARISON LIMIT REACHED", {
          description: "Compare up to 3 specimens simultaneously. Deselect one first.",
        });
        return prev;
      }
      return [...prev, id];
    });
  };

  const comparedMaterials = useMemo(
    () =>
      compareIds
        .map((id) => CATALOG_ITEMS.find((m) => m.id === id))
        .filter((m): m is CatalogItem => Boolean(m)),
    [compareIds]
  );

  const pinSpecimenToSchedule = (item: CatalogItem) => {
    const entry: ScheduleEntry = {
      uid: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: item.name,
      code: item.code,
      areaM2: 500,
      carbonPerM2: item.embodiedCarbon,
      baselinePerM2: item.baselineCarbon,
      rValue: item.rValue,
      uValue: Number((1 / (item.rValue + 0.17)).toFixed(2)),
      fireRating: item.fireRating.split(" (")[0],
      acousticNRC: item.acousticNRC,
      layerSummary: `${item.defaultThicknessMm}mm Reference Profile (${item.division})`,
    };
    setSchedule((prev) => [entry, ...prev]);
    toast("SPECIMEN PINNED TO SCHEDULE", {
      description: `${item.name} added to Project Schedule.`,
    });
  };

  // Schedule aggregate metrics
  const scheduleTotals = useMemo(() => {
    const totalArea = schedule.reduce((s, e) => s + e.areaM2, 0);
    const totalTonnes = schedule.reduce((s, e) => s + (e.carbonPerM2 * e.areaM2) / 1000, 0);
    const baselineTonnes = schedule.reduce((s, e) => s + (e.baselinePerM2 * e.areaM2) / 1000, 0);
    const savedTonnes = baselineTonnes - totalTonnes;
    const savedPct = baselineTonnes > 0 ? Math.round((savedTonnes / baselineTonnes) * 100) : 0;
    const weightedU =
      totalArea > 0
        ? schedule.reduce((s, e) => s + e.uValue * e.areaM2, 0) / totalArea
        : 0;
    return { totalArea, totalTonnes, baselineTonnes, savedTonnes, savedPct, weightedU };
  }, [schedule]);

  const updateScheduleArea = (uid: string, area: number) => {
    const safeArea = Math.max(1, Math.round(area) || 1);
    setSchedule((prev) =>
      prev.map((e) => (e.uid === uid ? { ...e, areaM2: safeArea } : e))
    );
  };

  const removeScheduleItem = (uid: string) => {
    setSchedule((prev) => prev.filter((e) => e.uid !== uid));
  };

  // Exports
  const handleExportCsv = () => {
    const header = [
      "Code",
      "Assembly / Material Name",
      "Layer Configuration",
      "Area (m2)",
      "A1-A3 GWP (kgCO2e/m2)",
      "Baseline (kgCO2e/m2)",
      "Net Tonnes (tCO2e)",
      "R-Value",
      "U-Value (W/m2K)",
      "Fire Rating",
      "NRC",
    ].join(",");
    const rows = schedule.map((e) =>
      [
        `"${e.code}"`,
        `"${e.name.replace(/"/g, '""')}"`,
        `"${e.layerSummary.replace(/"/g, '""')}"`,
        e.areaM2,
        e.carbonPerM2,
        e.baselinePerM2,
        ((e.carbonPerM2 * e.areaM2) / 1000).toFixed(2),
        e.rValue,
        e.uValue,
        `"${e.fireRating}"`,
        e.acousticNRC,
      ].join(",")
    );
    const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadTextFile(`${slug}-schedule.csv`, [header, ...rows].join("\n"), "text/csv;charset=utf-8");
    toast("SCHEDULE CSV EXPORTED", {
      description: `${schedule.length} assemblies exported for Revit / WBLCA import.`,
    });
  };

  const handleExportIfcJson = () => {
    const payload = {
      schema: "IFC4_STRATA_PSET_V2.4",
      project: projectName,
      exportedAt: new Date().toISOString(),
      wblcaSummary: {
        totalAreaM2: scheduleTotals.totalArea,
        specifiedTonnesCO2e: Number(scheduleTotals.totalTonnes.toFixed(2)),
        baselineTonnesCO2e: Number(scheduleTotals.baselineTonnes.toFixed(2)),
        netAvertedTonnesCO2e: Number(scheduleTotals.savedTonnes.toFixed(2)),
      },
      assemblies: schedule.map((e) => ({
        ifcName: e.name,
        csiCode: e.code,
        quantityM2: e.areaM2,
        Pset_EnvironmentalImpactIndicators: {
          ClimateChangePerUnit_kgCO2e_m2: e.carbonPerM2,
          ModuleScope: "A1-A3",
        },
        Pset_ThermalTransmittance: {
          ThermalTransmittance_W_m2K: e.uValue,
          ThermalResistance_m2K_W: e.rValue,
        },
        Pset_FireRating: e.fireRating,
        AcousticNRC: e.acousticNRC,
      })),
    };
    const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadTextFile(
      `${slug}-ifc4-assets.json`,
      JSON.stringify(payload, null, 2),
      "application/json"
    );
    toast("IFC4 PARAMETER PAYLOAD EXPORTED", {
      description: "JSON asset schema downloaded for BIM binding.",
    });
  };

  const handleExportProjectManual = () => {
    const doc = [
      `STRATA — COMPILED PROJECT SPECIFICATION MANUAL`,
      `PROJECT: ${projectName}`,
      `GENERATED: ${new Date().toISOString().split("T")[0]}`,
      `COMPLIANCE: ISO 14025 / EN 15804+A2 / CSI MasterFormat`,
      `================================================================================`,
      `WHOLE-BUILDING CARBON SUMMARY`,
      `  Scheduled Envelope Area:   ${scheduleTotals.totalArea.toLocaleString()} m²`,
      `  Specified Embodied Carbon: ${scheduleTotals.totalTonnes.toFixed(1)} tCO₂e`,
      `  Conventional Baseline:     ${scheduleTotals.baselineTonnes.toFixed(1)} tCO₂e`,
      `  Net Carbon Averted:        ${scheduleTotals.savedTonnes.toFixed(1)} tCO₂e (${scheduleTotals.savedPct}%)`,
      `================================================================================`,
      "",
      ...schedule.map(
        (e, i) => `SECTION ${i + 1}: ${e.code} — ${e.name.toUpperCase()}
  Configuration:    ${e.layerSummary}
  Scheduled Area:   ${e.areaM2.toLocaleString()} m²
  GWP (A1–A3):      ${e.carbonPerM2} kgCO₂e/m² (Net ${(
          (e.carbonPerM2 * e.areaM2) /
          1000
        ).toFixed(1)} tCO₂e)
  Thermal R / U:    R-${e.rValue} / U-${e.uValue} W/m²·K
  Fire Performance: ${e.fireRating}
  Acoustic NRC:     ${e.acousticNRC}
--------------------------------------------------------------------------------`
      ),
    ].join("\n");

    const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadTextFile(`${slug}-csi-manual.txt`, doc, "text/plain;charset=utf-8");
    toast("PROJECT SPEC MANUAL EXPORTED", {
      description: "Compiled multi-section specification text file downloaded.",
    });
  };

  return (
    <div className="min-h-screen bg-[#181816] text-[#F6F5F0] flex flex-col">
      {/* Persistent Workbench Top Chrome */}
      <header className="sticky top-0 z-40 bg-[#181816]/95 backdrop-blur-md border-b border-[#EAE7DF]/15">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-sans text-[#B8B19F] hover:text-[#F6F5F0] transition-colors pr-3 border-r border-[#EAE7DF]/15"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Overview
            </Link>
            <Link to="/" className="inline-flex items-center">
              <StrataLogo />
            </Link>
          </div>

          {/* Primary Workbench Navigation Tabs */}
          <nav className="flex items-center gap-1 p-1 rounded-xl bg-[#141412] border border-[#EAE7DF]/10">
            <button
              onClick={() => handleTabChange("composer")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-sans transition-colors flex items-center gap-1.5 ${
                activeTab === "composer"
                  ? "bg-[#C85A32] text-white font-medium"
                  : "text-[#B8B19F] hover:text-[#F6F5F0]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Assembly Composer
            </button>
            <button
              onClick={() => handleTabChange("library")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-sans transition-colors flex items-center gap-1.5 ${
                activeTab === "library"
                  ? "bg-[#C85A32] text-white font-medium"
                  : "text-[#B8B19F] hover:text-[#F6F5F0]"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Specimen Library
            </button>
            <button
              onClick={() => handleTabChange("schedule")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-sans transition-colors flex items-center gap-1.5 ${
                activeTab === "schedule"
                  ? "bg-[#C85A32] text-white font-medium"
                  : "text-[#B8B19F] hover:text-[#F6F5F0]"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Project Schedule
              <span className="ml-1 px-1.5 py-0.5 rounded bg-black/30 font-mono text-[10px]">
                {schedule.length}
              </span>
            </button>
          </nav>

          {/* Quick Project Export Actions */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              className="bg-white text-[#C85A32] hover:bg-[#181816] hover:text-white hover:border-[#EAE7DF]/30 border border-[#C85A32]/30 font-sans text-xs font-medium px-3 py-1.5 h-auto rounded-lg transition-all"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Sub-Bar: Active Project Metadata */}
        <div className="bg-[#141412] border-t border-[#EAE7DF]/10 py-2.5 px-4 md:px-6">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <span className="font-mono text-[#B8B19F]/70 uppercase text-[10px] tracking-wider">
                Project:
              </span>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                aria-label="Project Name"
                className="bg-transparent border-b border-transparent focus:border-[#C85A32] text-[#F6F5F0] font-sans font-medium focus:outline-none px-1 py-0.5 w-full max-w-md"
              />
            </div>
            <div className="flex items-center gap-5 font-mono text-[11px] text-[#B8B19F]">
              <span>
                Scheduled:{" "}
                <strong className="text-[#F6F5F0]">
                  {scheduleTotals.totalArea.toLocaleString()} m²
                </strong>
              </span>
              <span>
                WBLCA Net:{" "}
                <strong
                  className={
                    scheduleTotals.totalTonnes <= 0
                      ? "text-[#2E6F5E]"
                      : "text-[#F6F5F0]"
                  }
                >
                  {scheduleTotals.totalTonnes.toFixed(1)} tCO₂e
                </strong>
              </span>
              <span className="text-[#2E6F5E] hidden md:inline">
                Saved vs Baseline: {scheduleTotals.savedTonnes.toFixed(1)} t ({scheduleTotals.savedPct}%)
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workbench Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8">
        {/* =====================================================================
            TAB 01: PARAMETRIC ASSEMBLY COMPOSER
           ===================================================================== */}
        {activeTab === "composer" && (
          <div className="space-y-6">
            {/* Presets Strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#EAE7DF]/10">
              <div>
                <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#F6F5F0]">
                  Parametric Assembly Composer
                </h1>
                <p className="text-xs text-[#B8B19F] font-sans mt-0.5">
                  Stack, reorder, and resize substrates to calculate U-value, Glaser vapor behavior, and A1–A3 embodied carbon.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono text-[#B8B19F]/70 mr-1">
                  Presets:
                </span>
                {ASSEMBLY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="px-3 py-1.5 rounded-lg text-xs font-sans bg-[#1C1B18] border border-[#EAE7DF]/15 text-[#EAE7DF] hover:border-[#C85A32]/60 hover:text-white transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setLayers([]);
                    setAssemblyName("Custom Wall Assembly");
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-sans text-[#B8B19F] hover:text-[#C85A32] flex items-center gap-1 transition-colors"
                  title="Clear all layers"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: Layer Stack Builder (6 Cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="rounded-2xl bg-[#1C1B18] border border-[#EAE7DF]/15 p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b border-white/5">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[#B8B19F] block mb-1">
                        Assembly Designation
                      </label>
                      <Input
                        value={assemblyName}
                        onChange={(e) => setAssemblyName(e.target.value)}
                        className="bg-[#141412] border-[#EAE7DF]/15 text-sm font-sans text-[#F6F5F0] h-9"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[#B8B19F] block mb-1">
                        Envelope Area (m²)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={250000}
                        value={envelopeAreaM2}
                        onChange={(e) =>
                          setEnvelopeAreaM2(Math.max(1, Number(e.target.value) || 1))
                        }
                        className="bg-[#141412] border-[#EAE7DF]/15 text-sm font-mono text-[#F6F5F0] h-9"
                      />
                    </div>
                  </div>

                  {/* Layer Ordering Header */}
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#B8B19F]/70">
                    <span>Exterior Weather Face → Interior Datum</span>
                    <span>{resolvedLayers.length} Layers</span>
                  </div>

                  {resolvedLayers.length === 0 ? (
                    <div className="py-10 text-center rounded-xl border border-dashed border-[#EAE7DF]/15 bg-[#141412]/50 text-xs text-[#B8B19F]">
                      No substrates stacked yet. Select a material below to add a layer.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {resolvedLayers.map((layer, idx) => {
                        const isSelected = selectedLayerUid === layer.uid;
                        const swatchColor =
                          layer.material.layers[1]?.color ||
                          layer.material.layers[0]?.color ||
                          "#C85A32";
                        return (
                          <div
                            key={layer.uid}
                            onClick={() => setSelectedLayerUid(layer.uid)}
                            className={`p-3.5 rounded-xl border transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-[#23211D] border-[#C85A32]/70"
                                : "bg-[#141412] border-white/10 hover:border-[#EAE7DF]/25"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5">
                                <span
                                  className="w-3.5 h-3.5 rounded-sm mt-1 shrink-0 border border-white/20"
                                  style={{ backgroundColor: swatchColor }}
                                />
                                <div>
                                  <div className="text-xs font-mono text-[#B8B19F]/80">
                                    L{idx + 1} · {layer.material.code}
                                  </div>
                                  <div className="text-sm font-sans font-medium text-[#F6F5F0]">
                                    {layer.material.name}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveLayer(layer.uid, -1);
                                  }}
                                  disabled={idx === 0}
                                  className="p-1 rounded text-[#B8B19F] hover:text-white disabled:opacity-25"
                                  aria-label="Move layer outward"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveLayer(layer.uid, 1);
                                  }}
                                  disabled={idx === resolvedLayers.length - 1}
                                  className="p-1 rounded text-[#B8B19F] hover:text-white disabled:opacity-25"
                                  aria-label="Move layer inward"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeLayer(layer.uid);
                                  }}
                                  className="p-1 rounded text-[#B8B19F] hover:text-[#C85A32]"
                                  aria-label="Remove layer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Thickness Control & Layer Contributions */}
                            <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-3 flex-1 min-w-[170px]">
                                <Slider
                                  value={[layer.thicknessMm]}
                                  min={5}
                                  max={400}
                                  step={5}
                                  onValueChange={(val) =>
                                    updateLayerThickness(layer.uid, val[0])
                                  }
                                  className="flex-1"
                                />
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={5}
                                    max={500}
                                    value={layer.thicknessMm}
                                    onChange={(e) =>
                                      updateLayerThickness(
                                        layer.uid,
                                        Number(e.target.value)
                                      )
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-14 bg-[#1C1B18] border border-white/15 rounded px-1.5 py-0.5 text-xs font-mono text-right text-[#F6F5F0]"
                                  />
                                  <span className="text-[11px] font-mono text-[#B8B19F]">
                                    mm
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 text-[11px] font-mono">
                                <span className="text-[#EAE7DF]/80">
                                  R-{layer.layerR.toFixed(2)}
                                </span>
                                <span
                                  className={
                                    layer.carbonContribution < 0
                                      ? "text-[#2E6F5E]"
                                      : "text-[#B8B19F]"
                                  }
                                >
                                  {layer.carbonContribution > 0 ? "+" : ""}
                                  {layer.carbonContribution.toFixed(1)} kgCO₂e
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Substrate Layer Control */}
                  <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row gap-2">
                    <select
                      value={addMaterialId}
                      onChange={(e) => setAddMaterialId(e.target.value)}
                      className="flex-1 bg-[#141412] border border-[#EAE7DF]/20 rounded-lg px-3 py-2 text-xs font-sans text-[#F6F5F0] focus:outline-none focus:border-[#C85A32]"
                    >
                      {CATALOG_ITEMS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.defaultThicknessMm}mm · {m.embodiedCarbon} kgCO₂e/m²)
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={() => addLayerToComposer(addMaterialId)}
                      className="bg-[#C85A32] hover:bg-[#A64522] text-white font-sans text-xs font-medium px-4 py-2 h-auto rounded-lg"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Add Layer
                    </Button>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Live CAD Cross-Section + Calculated Metrics (6 Cols) */}
              <div className="lg:col-span-6 space-y-4">
                {/* CAD Cross-Section Visualizer */}
                <div className="rounded-2xl bg-[#1C1B18] border border-[#EAE7DF]/15 p-5">
                  <div className="flex items-center justify-between text-xs font-mono text-[#B8B19F] pb-3 border-b border-white/5 mb-4">
                    <span className="text-[#C85A32]">
                      SECTION A-A' // PARAMETRIC STACK
                    </span>
                    <span>TOTAL DEPTH: {assemblyMetrics.totalDepthMm} mm</span>
                  </div>

                  {/* Proportional Horizontal Wall Section SVG */}
                  <div className="bg-[#141412] rounded-xl border border-white/5 p-4">
                    <div className="flex justify-between text-[10px] font-mono text-[#B8B19F]/70 mb-2">
                      <span>← EXTERIOR (-5°C / 80% RH)</span>
                      <span>INTERIOR (+21°C / 50% RH) →</span>
                    </div>

                    {resolvedLayers.length === 0 ? (
                      <div className="h-36 flex items-center justify-center text-xs font-mono text-[#B8B19F]/50">
                        EMPTY SECTION PLANE
                      </div>
                    ) : (
                      <div className="flex items-stretch h-40 w-full rounded-lg overflow-hidden border border-[#EAE7DF]/20">
                        {resolvedLayers.map((layer, i) => {
                          const widthPct = Math.max(
                            6,
                            (layer.thicknessMm / Math.max(1, assemblyMetrics.totalDepthMm)) *
                              100
                          );
                          const fill =
                            layer.material.layers[1]?.color ||
                            layer.material.layers[0]?.color ||
                            "#6E6857";
                          const isSelected = selectedLayerUid === layer.uid;
                          return (
                            <div
                              key={layer.uid}
                              onClick={() => setSelectedLayerUid(layer.uid)}
                              style={{
                                width: `${widthPct}%`,
                                backgroundColor: fill,
                              }}
                              className={`relative cursor-pointer transition-all flex flex-col justify-between p-1.5 border-r border-black/40 last:border-r-0 ${
                                isSelected ? "ring-2 ring-inset ring-[#C85A32]" : ""
                              }`}
                              title={`${layer.material.name} (${layer.thicknessMm}mm)`}
                            >
                              <div className="absolute inset-0 cad-grid-dark opacity-30 pointer-events-none" />
                              <span className="relative z-10 text-[10px] font-mono font-semibold text-white bg-black/55 px-1 py-0.5 rounded w-fit">
                                L{i + 1}
                              </span>
                              <span className="relative z-10 text-[10px] font-mono text-white bg-black/55 px-1 py-0.5 rounded w-fit">
                                {layer.thicknessMm}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Dimension Chain Legend */}
                    {resolvedLayers.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {resolvedLayers.map((layer, idx) => (
                          <button
                            key={layer.uid}
                            onClick={() => setSelectedLayerUid(layer.uid)}
                            className={`text-[11px] font-mono px-2 py-1 rounded border transition-colors ${
                              selectedLayerUid === layer.uid
                                ? "border-[#C85A32] bg-[#C85A32]/15 text-[#F6F5F0]"
                                : "border-white/10 bg-[#1C1B18] text-[#B8B19F]"
                            }`}
                          >
                            L{idx + 1}: {layer.material.name.split(" ")[0]} ({layer.thicknessMm}mm)
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Calculated Engineering Physics & Carbon Grid */}
                <div className="rounded-2xl bg-[#1C1B18] border border-[#EAE7DF]/15 p-5 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-[#141412] border border-white/5">
                      <span className="text-[10px] font-mono text-[#B8B19F] block">
                        A1–A3 GWP
                      </span>
                      <div
                        className={`text-xl font-serif font-normal mt-1 ${
                          assemblyMetrics.totalCarbonPerM2 < 0
                            ? "text-[#2E6F5E]"
                            : "text-[#F6F5F0]"
                        }`}
                      >
                        {assemblyMetrics.totalCarbonPerM2.toFixed(1)}
                      </div>
                      <span className="text-[10px] font-mono text-[#B8B19F]/70">
                        kgCO₂e/m²
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#141412] border border-white/5">
                      <span className="text-[10px] font-mono text-[#B8B19F] block">
                        Thermal U / R
                      </span>
                      <div className="text-xl font-serif font-normal text-[#F6F5F0] mt-1">
                        {assemblyMetrics.uValue.toFixed(2)}
                      </div>
                      <span className="text-[10px] font-mono text-[#B8B19F]/70">
                        W/m²K · R-{assemblyMetrics.totalR.toFixed(1)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#141412] border border-white/5">
                      <span className="text-[10px] font-mono text-[#B8B19F] block">
                        Acoustics
                      </span>
                      <div className="text-xl font-serif font-normal text-[#F6F5F0] mt-1">
                        {assemblyMetrics.rwEstimate} dB
                      </div>
                      <span className="text-[10px] font-mono text-[#B8B19F]/70">
                        NRC {assemblyMetrics.maxNRC.toFixed(2)} max
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#141412] border border-white/5">
                      <span className="text-[10px] font-mono text-[#B8B19F] block">
                        Project Delta
                      </span>
                      <div className="text-xl font-serif font-normal text-[#2E6F5E] mt-1">
                        {assemblyMetrics.savedTonnes >= 0 ? "-" : "+"}
                        {Math.abs(assemblyMetrics.savedTonnes).toFixed(1)} t
                      </div>
                      <span className="text-[10px] font-mono text-[#2E6F5E]">
                        {assemblyMetrics.savedPct}% vs OPC/Steel
                      </span>
                    </div>
                  </div>

                  {/* Glaser Vapor & Fire Compliance Readout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div
                      className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                        assemblyMetrics.vaporWarning
                          ? "bg-[#C85A32]/10 border-[#C85A32]/40 text-[#EAE7DF]"
                          : "bg-[#2E6F5E]/10 border-[#2E6F5E]/30 text-[#EAE7DF]"
                      }`}
                    >
                      <Thermometer
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          assemblyMetrics.vaporWarning
                            ? "text-[#C85A32]"
                            : "text-[#2E6F5E]"
                        }`}
                      />
                      <div>
                        <span className="font-mono text-[11px] font-semibold block">
                          {assemblyMetrics.vaporWarning
                            ? "Glaser Vapor Trap Warning"
                            : "Vapor-Open Hygrothermal Profile"}
                        </span>
                        <span className="text-[11px] text-[#B8B19F] block mt-0.5">
                          {assemblyMetrics.vaporWarning
                            ? "Low-permeability exterior face over biogenic core may accumulate interstitial condensation."
                            : "Continuous vapor permeability prevents interstitial dew-point accumulation."}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#141412] border border-white/5 flex items-start gap-2.5">
                      <Flame className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-mono text-[11px] font-semibold text-[#F6F5F0] block">
                          Fire Compliance: {assemblyMetrics.fireSummary}
                        </span>
                        <span className="text-[11px] text-[#B8B19F] block mt-0.5">
                          Governing envelope ignition &amp; smoke index per ASTM E84 / EN 13501.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Composer Action Row */}
                  <div className="pt-2 flex flex-wrap gap-3">
                    <Button
                      size="sm"
                      onClick={saveAssemblyToSchedule}
                      disabled={resolvedLayers.length === 0}
                      className="flex-1 bg-[#C85A32] hover:bg-[#A64522] text-white font-sans text-xs font-medium px-4 py-2.5 h-auto rounded-lg"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5 mr-1.5" />
                      Save to Project Schedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={inspectComposedSpec}
                      disabled={resolvedLayers.length === 0}
                      className="bg-white text-[#C85A32] hover:bg-[#181816] hover:text-white hover:border-[#EAE7DF]/30 border border-[#C85A32]/30 font-sans text-xs font-medium px-4 py-2.5 h-auto rounded-lg transition-all"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      Inspect 3-Part CSI Spec
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 02: SPECIMEN LIBRARY & SIDE-BY-SIDE COMPARISON
           ===================================================================== */}
        {activeTab === "library" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-[#EAE7DF]/10">
              <div>
                <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#F6F5F0]">
                  EPD Specimen Library &amp; Matrix Compare
                </h1>
                <p className="text-xs text-[#B8B19F] font-sans mt-0.5">
                  Filter verified specimens, compare up to 3 side-by-side, or push layers directly into your Assembly Composer.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#B8B19F]">
                <GitCompare className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Comparing {compareIds.length}/3 specimens</span>
              </div>
            </div>

            {/* Side-by-Side Comparison Matrix */}
            {comparedMaterials.length > 0 && (
              <div className="rounded-2xl bg-[#1C1B18] border border-[#EAE7DF]/15 overflow-hidden">
                <div className="px-5 py-3 bg-[#141412] border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-mono text-[#C85A32] uppercase tracking-wider">
                    Side-by-Side Specification Comparison
                  </span>
                  <button
                    onClick={() => setCompareIds([])}
                    className="text-xs font-sans text-[#B8B19F] hover:text-white"
                  >
                    Clear Compare
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[#B8B19F]">
                        <th className="py-3 px-4 font-mono uppercase text-[10px] w-44">
                          Parameter
                        </th>
                        {comparedMaterials.map((m) => (
                          <th key={m.id} className="py-3 px-4 font-serif font-normal text-base text-[#F6F5F0]">
                            {m.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#B8B19F]">
                          A1–A3 Carbon
                        </td>
                        {comparedMaterials.map((m) => (
                          <td
                            key={m.id}
                            className={`py-2.5 px-4 font-mono font-semibold ${
                              m.embodiedCarbon < 0 ? "text-[#2E6F5E]" : "text-[#F6F5F0]"
                            }`}
                          >
                            {m.embodiedCarbon > 0 ? `+${m.embodiedCarbon}` : m.embodiedCarbon} kgCO₂e/m²
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#B8B19F]">
                          Conductivity / R-Val
                        </td>
                        {comparedMaterials.map((m) => (
                          <td key={m.id} className="py-2.5 px-4 font-mono text-[#EAE7DF]">
                            {m.conductivity} · R-{m.rValue}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#B8B19F]">
                          Acoustic NRC
                        </td>
                        {comparedMaterials.map((m) => (
                          <td key={m.id} className="py-2.5 px-4 font-mono text-[#EAE7DF]">
                            {m.acousticNRC} NRC
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#B8B19F]">
                          Fire Class
                        </td>
                        {comparedMaterials.map((m) => (
                          <td key={m.id} className="py-2.5 px-4 text-[#EAE7DF]">
                            {m.fireRating}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#B8B19F]">
                          Structural Strength
                        </td>
                        {comparedMaterials.map((m) => (
                          <td key={m.id} className="py-2.5 px-4 text-[#EAE7DF]">
                            {m.tensileStrength}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#B8B19F]">
                          Provenance &amp; Lead
                        </td>
                        {comparedMaterials.map((m) => (
                          <td key={m.id} className="py-2.5 px-4 text-[#B8B19F]">
                            {m.provenance} ({m.leadTime})
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Filter & Sort Controls */}
            <div className="bg-[#1C1B18] p-4 rounded-2xl border border-[#EAE7DF]/15 space-y-3">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-[#B8B19F] absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter specimens by code, name, quarry, or application..."
                    className="pl-9 bg-[#141412] border-[#EAE7DF]/15 text-xs text-[#F6F5F0]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#B8B19F]">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "carbon" | "rvalue" | "acoustic")}
                    className="bg-[#141412] border border-[#EAE7DF]/20 rounded-lg px-3 py-2 text-xs font-sans text-[#F6F5F0]"
                  >
                    <option value="carbon">Lowest Embodied Carbon</option>
                    <option value="rvalue">Highest Thermal R-Value</option>
                    <option value="acoustic">Highest Acoustic NRC</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                <div className="flex flex-wrap gap-1.5">
                  {DIVISIONS.map((div) => (
                    <button
                      key={div}
                      onClick={() => setSelectedDivision(div)}
                      className={`px-2.5 py-1 rounded text-xs font-sans transition-colors ${
                        selectedDivision === div
                          ? "bg-[#C85A32] text-white font-medium"
                          : "text-[#B8B19F] hover:text-white bg-[#141412]"
                      }`}
                    >
                      {div}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CARBON_FILTERS.map((cf) => (
                    <button
                      key={cf.id}
                      onClick={() => setSelectedCarbonFilter(cf.id)}
                      className={`px-2.5 py-1 rounded text-xs font-sans border transition-colors ${
                        selectedCarbonFilter === cf.id
                          ? "bg-[#2E6F5E]/20 border-[#2E6F5E] text-[#2E6F5E] font-medium"
                          : "border-white/10 text-[#B8B19F] hover:text-white"
                      }`}
                    >
                      {cf.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Catalog Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCatalog.map((item) => {
                const isCompared = compareIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl bg-[#1C1B18] border p-5 flex flex-col justify-between transition-colors ${
                      isCompared ? "border-[#C85A32]" : "border-[#EAE7DF]/15"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-mono text-[#B8B19F]">
                          {item.code}
                        </span>
                        <button
                          onClick={() => toggleCompare(item.id)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono border flex items-center gap-1 transition-colors ${
                            isCompared
                              ? "bg-[#C85A32] text-white border-[#C85A32]"
                              : "bg-[#141412] text-[#B8B19F] border-white/10 hover:text-white"
                          }`}
                        >
                          {isCompared && <Check className="w-3 h-3" />}
                          Compare
                        </button>
                      </div>

                      <h3 className="text-lg font-serif font-normal text-[#F6F5F0] mt-2">
                        {item.name}
                      </h3>
                      <p className="text-xs text-[#EAE7DF]/70 font-sans mt-1 line-clamp-2">
                        {item.subTitle}
                      </p>

                      <div className="grid grid-cols-3 gap-2 my-4 p-3 rounded-xl bg-[#141412] border border-white/5 text-center font-mono">
                        <div>
                          <span className="text-[10px] text-[#B8B19F] block">GWP</span>
                          <span
                            className={`text-xs font-semibold ${
                              item.embodiedCarbon < 0
                                ? "text-[#2E6F5E]"
                                : "text-[#F6F5F0]"
                            }`}
                          >
                            {item.embodiedCarbon > 0 ? `+${item.embodiedCarbon}` : item.embodiedCarbon}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#B8B19F] block">R-Val</span>
                          <span className="text-xs text-[#F6F5F0]">R-{item.rValue}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#B8B19F] block">NRC</span>
                          <span className="text-xs text-[#F6F5F0]">{item.acousticNRC}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-[#B8B19F] font-sans flex items-center gap-1.5 mb-4">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#2E6F5E] shrink-0" />
                        <span className="truncate">{item.provenance}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => addLayerToComposer(item.id)}
                        className="flex-1 bg-[#C85A32] hover:bg-[#A64522] text-white font-sans text-xs font-medium px-2.5 py-2 h-auto rounded-lg"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        To Composer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => pinSpecimenToSchedule(item)}
                        className="bg-white text-[#C85A32] hover:bg-[#181816] hover:text-white hover:border-[#EAE7DF]/30 border border-[#C85A32]/30 font-sans text-xs font-medium px-2.5 py-2 h-auto rounded-lg transition-all"
                        title="Pin to Project Schedule"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                      </Button>
                      <button
                        onClick={() => {
                          setSpecMaterial(item);
                          setSpecModalOpen(true);
                        }}
                        className="px-2.5 py-2 rounded-lg bg-[#141412] border border-white/10 text-xs font-sans text-[#EAE7DF] hover:border-[#EAE7DF]/30 transition-colors"
                      >
                        Spec
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 03: PROJECT SCHEDULE & WBLCA LEDGER
           ===================================================================== */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-[#EAE7DF]/10">
              <div>
                <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#F6F5F0]">
                  Project Schedule &amp; WBLCA Carbon Ledger
                </h1>
                <p className="text-xs text-[#B8B19F] font-sans mt-0.5">
                  Adjust scheduled surface areas and export complete construction documentation.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={handleExportProjectManual}
                  disabled={schedule.length === 0}
                  className="bg-[#C85A32] hover:bg-[#A64522] text-white font-sans text-xs font-medium px-4 py-2 h-auto rounded-lg"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Download CSI Manual (.txt)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportIfcJson}
                  disabled={schedule.length === 0}
                  className="bg-white text-[#C85A32] hover:bg-[#181816] hover:text-white hover:border-[#EAE7DF]/30 border border-[#C85A32]/30 font-sans text-xs font-medium px-3.5 py-2 h-auto rounded-lg transition-all"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  IFC4 JSON
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportCsv}
                  disabled={schedule.length === 0}
                  className="bg-white text-[#C85A32] hover:bg-[#181816] hover:text-white hover:border-[#EAE7DF]/30 border border-[#C85A32]/30 font-sans text-xs font-medium px-3.5 py-2 h-auto rounded-lg transition-all"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Schedule CSV
                </Button>
              </div>
            </div>

            {/* WBLCA Rollup Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#1C1B18] border border-[#EAE7DF]/15">
                <span className="text-xs font-mono text-[#B8B19F] block">
                  Total Envelope Area
                </span>
                <div className="text-2xl sm:text-3xl font-serif font-normal text-[#F6F5F0] mt-1">
                  {scheduleTotals.totalArea.toLocaleString()} m²
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-[#1C1B18] border border-[#EAE7DF]/15">
                <span className="text-xs font-mono text-[#B8B19F] block">
                  STRATA Specified Carbon
                </span>
                <div
                  className={`text-2xl sm:text-3xl font-serif font-normal mt-1 ${
                    scheduleTotals.totalTonnes <= 0
                      ? "text-[#2E6F5E]"
                      : "text-[#F6F5F0]"
                  }`}
                >
                  {scheduleTotals.totalTonnes.toFixed(1)} tCO₂e
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-[#2E6F5E]/10 border border-[#2E6F5E]/30">
                <span className="text-xs font-mono text-[#2E6F5E] block">
                  Net Carbon Averted
                </span>
                <div className="text-2xl sm:text-3xl font-serif font-normal text-[#2E6F5E] mt-1">
                  {scheduleTotals.savedTonnes.toFixed(1)} t ({scheduleTotals.savedPct}%)
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-[#1C1B18] border border-[#EAE7DF]/15">
                <span className="text-xs font-mono text-[#B8B19F] block">
                  Weighted Avg U-Value
                </span>
                <div className="text-2xl sm:text-3xl font-serif font-normal text-[#F6F5F0] mt-1">
                  {scheduleTotals.weightedU.toFixed(2)} W/m²K
                </div>
              </div>
            </div>

            {/* Schedule Table */}
            {schedule.length === 0 ? (
              <div className="p-12 rounded-2xl bg-[#1C1B18] border border-[#EAE7DF]/15 text-center space-y-3">
                <p className="text-base font-serif text-[#EAE7DF]">
                  Your project specification schedule is empty.
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    size="sm"
                    onClick={() => handleTabChange("composer")}
                    className="bg-[#C85A32] hover:bg-[#A64522] text-white font-sans text-xs px-4 py-2 h-auto rounded-lg"
                  >
                    Build an Assembly
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTabChange("library")}
                    className="bg-white text-[#C85A32] hover:bg-[#181816] hover:text-white hover:border-[#EAE7DF]/30 border border-[#C85A32]/30 font-sans text-xs font-medium px-4 py-2 h-auto rounded-lg transition-all"
                  >
                    Browse Specimens
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-[#1C1B18] border border-[#EAE7DF]/15 overflow-x-auto">
                <table className="w-full text-left font-sans text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#EAE7DF]/10 bg-[#141412] text-[#B8B19F] font-mono uppercase text-[10px]">
                      <th className="py-3.5 px-4">Code &amp; Assembly</th>
                      <th className="py-3.5 px-4">Area (m²)</th>
                      <th className="py-3.5 px-4">GWP (A1–A3)</th>
                      <th className="py-3.5 px-4">Total Tonnes</th>
                      <th className="py-3.5 px-4">U-Val / NRC</th>
                      <th className="py-3.5 px-4">Fire Class</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {schedule.map((entry) => {
                      const netTonnes = (entry.carbonPerM2 * entry.areaM2) / 1000;
                      return (
                        <tr key={entry.uid} className="hover:bg-white/[0.02]">
                          <td className="py-4 px-4">
                            <div className="text-sm font-serif font-normal text-[#F6F5F0]">
                              {entry.name}
                            </div>
                            <div className="text-[11px] font-mono text-[#B8B19F]/70 mt-0.5">
                              {entry.code} · {entry.layerSummary}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={1}
                                value={entry.areaM2}
                                onChange={(e) =>
                                  updateScheduleArea(entry.uid, Number(e.target.value))
                                }
                                className="w-20 bg-[#141412] border border-[#EAE7DF]/20 rounded px-2 py-1 font-mono text-xs text-[#F6F5F0]"
                              />
                              <span className="font-mono text-[#B8B19F]">m²</span>
                            </div>
                          </td>
                          <td
                            className={`py-4 px-4 font-mono ${
                              entry.carbonPerM2 < 0
                                ? "text-[#2E6F5E]"
                                : "text-[#F6F5F0]"
                            }`}
                          >
                            {entry.carbonPerM2 > 0 ? `+${entry.carbonPerM2}` : entry.carbonPerM2} kg/m²
                          </td>
                          <td
                            className={`py-4 px-4 font-mono font-semibold ${
                              netTonnes < 0 ? "text-[#2E6F5E]" : "text-[#F6F5F0]"
                            }`}
                          >
                            {netTonnes.toFixed(1)} t
                          </td>
                          <td className="py-4 px-4 font-mono text-[#EAE7DF]">
                            {entry.uValue} W/m²K · {entry.acousticNRC}
                          </td>
                          <td className="py-4 px-4 text-[#EAE7DF]">
                            {entry.fireRating}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => removeScheduleItem(entry.uid)}
                              className="p-1.5 rounded text-[#B8B19F] hover:text-[#C85A32] transition-colors"
                              aria-label="Remove schedule item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* CSI MasterFormat Specification Modal */}
      <SpecSheetModal
        open={specModalOpen}
        onOpenChange={setSpecModalOpen}
        material={specMaterial}
      />
    </div>
  );
};

export default Workbench;
