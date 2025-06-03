export function formatQuarter(dateString: string) {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `Q${Math.ceil(month / 3)} ${year}`;
};

export function isQuarterEnd(toutc: string) {
  const date = new Date(toutc);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return (
    (month === 3 && day === 31) || // Q1
    (month === 6 && day === 30) || // Q2
    (month === 9 && day === 30) || // Q3
    (month === 12 && day === 31) // Q4
  ); 
};

interface QuarterlyData {
  vesselId: number;
  quarter: string;
  quarterEnd: string;
  deviation: number;
}

export function processVesselData(data: QuarterlyData[], vesselId: number) {
  // Group data by quarter and calculate average deviation
  const quarterData = data
    .filter((d) => d.vesselId === vesselId)
    .reduce((acc, curr) => {
      if (!acc[curr.quarter]) {
        acc[curr.quarter] = {
          sum: curr.deviation,
          count: 1,
          quarterEnd: curr.quarterEnd,
        };
      } else {
        acc[curr.quarter].sum += curr.deviation;
        acc[curr.quarter].count += 1;
        // Keep the earliest quarterEnd for sorting
        if (curr.quarterEnd < acc[curr.quarter].quarterEnd) {
          acc[curr.quarter].quarterEnd = curr.quarterEnd;
        }
      }
      return acc;
    }, {} as Record<string, { sum: number; count: number; quarterEnd: string }>);

  // Convert to array and calculate averages
  return Object.entries(quarterData)
    .map(([quarter, { sum, count, quarterEnd }]) => ({
      quarter,
      quarterEnd,
      deviation: parseFloat((sum / count).toFixed(2)),
    }))
    .sort((a, b) => a.quarterEnd.localeCompare(b.quarterEnd));
}

export function getChartSeries(
  data: QuarterlyData[],
  vessels: any, // TODO: fix this
  selectedVessel: string
) {
  if (selectedVessel === "all") {
    return vessels.map((vessel) => ({
      type: "line",
      name: vessel.Name,
      data: processVesselData(data, vessel.IMONo).map((d) => d.deviation),
      marker: { enabled: true },
    }));
  }

  return [
    {
      type: "line",
      name:
        vessels.find((v) => v.IMONo.toString() === selectedVessel)?.Name ||
        "Deviation",
      data: processVesselData(data, parseInt(selectedVessel)).map(
        (d) => d.deviation
      ),
      marker: { enabled: true },
    },
  ];
}

export function avgDeviation(data: QuarterlyData[]): number {
  return data.length > 0
    ? parseFloat(
        (data.reduce((sum, q) => sum + q.deviation, 0) / data.length).toFixed(2)
      )
    : 0;
}