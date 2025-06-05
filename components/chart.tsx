"use client";

import { useState, useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Ship } from "lucide-react";
import {
  calculatePPSCCBaselines,
  getPPFactors,
} from "../utils/calculate-pp-scc-baselines.util";
import Decimal from "decimal.js";
import { formatQuarter, getChartSeries, isQuarterEnd } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import {
  getAllEmissions,
  getAllReferences,
  getAllVessels,
} from "@/services/api/data.api";
import {
  Emission,
  PPSCCReferenceLine,
  Vessel,
} from "@/prisma/generated/prisma";

const Chart = () => {
  const [selectedVessel, setSelectedVessel] = useState<string>("all");

  const { data: vessels, isLoading: isLoadingVessels } = useQuery<Vessel[]>({
    queryKey: ["vessels"],
    queryFn: getAllVessels,
  });

  const { data: emissions, isLoading: isLoadingEmissions } = useQuery<
    Emission[]
  >({
    queryKey: ["emissions"],
    queryFn: getAllEmissions,
  });

  const { data: references, isLoading: isLoadingReferences } = useQuery<
    PPSCCReferenceLine[]
  >({
    queryKey: ["references"],
    queryFn: getAllReferences,
  });

  const isLoading =
    isLoadingVessels || isLoadingEmissions || isLoadingReferences;

  const calculatedData = useMemo(() => {
    if (!vessels || !emissions || !references) return [];

    const filteredEmissions = emissions
      .filter((emission) => isQuarterEnd(emission.toUtc))
      .sort(
        (a, b) => new Date(a.toUtc).getTime() - new Date(b.toUtc).getTime()
      );

    const result = vessels
      .map((vessel) => {
        const vesselEmissions = filteredEmissions.filter(
          (e) => e.vesselId === vessel.id
        );

        const ppFactors = getPPFactors(references, vessel);

        // Get the year from the first emission record for this vessel
        const emissionYear =
          vesselEmissions.length > 0
            ? new Date(vesselEmissions[0].toUtc).getFullYear()
            : new Date().getFullYear();

        const baselines = calculatePPSCCBaselines({
          factors: [ppFactors[0].minFactors, ppFactors[0].strFactors],
          year: emissionYear,
          DWT: new Decimal(vessel?.maxDeadWg ?? 0),
        });

        const ppMinBaseline = Math.abs(baselines.min.toNumber());

        return vesselEmissions
          .filter((emission) => {
            // filter out invalid AERCO2eW2W values
            return emission.aerco2ew2w > 0;
          })
          .map((emission) => {
            const actualEmissions = emission.aerco2ew2w;
            const deviation =
              ((actualEmissions - ppMinBaseline) / ppMinBaseline) * 100;
            return {
              vesselId: vessel.imoNo,
              quarter: formatQuarter(emission.toUtc),
              deviation: parseFloat(deviation.toFixed(2)),
            };
          });
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .flat()
      .filter((v) => v !== null);

    return result;
  }, [vessels, emissions, references]);

  const selectedData = calculatedData.filter((d) => {
    return selectedVessel === "all" || d.vesselId.toString() === selectedVessel;
  });

  const availableVessels =
    vessels?.filter((v) =>
      calculatedData.some((d) => d.vesselId === v.imoNo)
    ) ?? [];

  const chartOptions: Highcharts.Options = {
    chart: {
      type: "line",
      height: 500,
    },
    title: {
      text: "Poseidon Principles Deviation Trend",
    },
    credits: {
      enabled: false,
    },
    legend: {
      enabled: true,
      layout: "horizontal",
      align: "center",
      verticalAlign: "bottom",
    },
    xAxis: {
      categories: [...new Set(selectedData.map((d) => d.quarter))],
      crosshair: true,
    },
    yAxis: {
      title: { text: "Deviation (%)" },
      plotLines: [
        {
          value: 0,
          color: "#ef4444",
          dashStyle: "Dash",
          width: 2,
          label: { text: "PP Baseline (0%)" },
        },
      ],
    },
    series: getChartSeries(selectedData, availableVessels, selectedVessel),
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Ship className="w-5 h-5 text-blue-600" />
              <select
                value={selectedVessel}
                onChange={(e) => setSelectedVessel(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                disabled={isLoading}
              >
                <option value="all">All Vessels</option>
                {availableVessels.map((vessel) => (
                  <option key={vessel.imoNo} value={vessel.imoNo.toString()}>
                    {vessel.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
          {isLoading ? (
            <div className="flex items-center justify-center h-[500px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <HighchartsReact highcharts={Highcharts} options={chartOptions} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Chart;
