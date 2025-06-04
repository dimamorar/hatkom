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
  deviation: number;
}

export function processVesselData(data: QuarterlyData[], vesselId: number) {
  const quarterData = data
    .filter((d) => d.vesselId === vesselId)
    .reduce((acc, curr) => {
      if (!acc[curr.quarter]) {
        acc[curr.quarter] = {
          sum: curr.deviation,
          count: 1,
        };
      } else {
        acc[curr.quarter].sum += curr.deviation;
        acc[curr.quarter].count += 1;
      }
      return acc;
    }, {} as Record<string, { sum: number; count: number }>);

  return Object.entries(quarterData)
    .map(([quarter, { sum, count }]) => ({
      quarter,
      deviation: parseFloat((sum / count).toFixed(2)),
    }));
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
