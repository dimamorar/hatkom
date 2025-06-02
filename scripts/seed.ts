import { prisma } from '../lib/prisma'
import vessels from '../data/vessels.json'
import ppReference from '../data/pp-reference.json'
import dailyLogEmissions from '../data/daily-log-emissions.json'

async function main() {
  console.log('Cleaning up existing records...')
  await prisma.emission.deleteMany()
  await prisma.pPSCCReferenceLine.deleteMany()
  await prisma.vessel.deleteMany()


  // First, create all vessels
  console.log('Seeding vessels...')
  const vesselMap = new Map()
  for (const vessel of vessels) {
    const created = await prisma.vessel.upsert({
      where: { imoNo: vessel.IMONo },
      update: {},
      create: {
        name: vessel.Name,
        imoNo: vessel.IMONo,
        vesselType: vessel.VesselType,
      },
    })
    vesselMap.set(vessel.IMONo, created.id)
  }

  // Then, create PP reference lines
  console.log('Seeding PP reference lines...')
  for (const ref of ppReference) {
    await prisma.pPSCCReferenceLine.upsert({
      where: { id: ref.RowID },
      update: {},
      create: {
        id: ref.RowID,
        category: ref.Category,
        vesselTypeId: ref.VesselTypeID,
        size: ref.Size.trim(),
        traj: ref.Traj.trim(),
        a: ref.a,
        b: ref.b,
        c: ref.c,
        d: ref.d,
        e: ref.e,
      },
    })
  }

  // Finally, create emissions using the vessel IDs from the map
  console.log('Seeding emissions...')
  for (const emission of dailyLogEmissions) {
    const vesselId = vesselMap.get(emission.VesselID)
    if (!vesselId) {
      console.warn(`Skipping emission ${emission.EID}: Vessel ${emission.VesselID} not found`)
      continue
    }

    await prisma.emission.upsert({
      where: { id: emission.EID },
      update: {},
      create: {
        id: emission.EID,
        vesselId,
        logId: emission.LOGID,
        fromUtc: new Date(emission.FromUTC),
        toUtc: new Date(emission.TOUTC),
        met2wco2: emission.MET2WCO2,
        aet2wco2: emission.AET2WCO2,
        bot2wco2: emission.BOT2WCO2,
        vrt2wco2: emission.VRT2WCO2,
        totT2wco2: emission.TotT2WCO2,
        mew2wco2e: emission.MEW2WCO2e,
        aew2wco2e: emission.AEW2WCO2e,
        bow2wco2e: emission.BOW2WCO2e,
        vrw2wco2e: emission.VRW2WCO2e,
        totW2wco2: emission.ToTW2WCO2,
        mesox: emission.MESox,
        aesox: emission.AESox,
        bosox: emission.BOSox,
        vrsox: emission.VRSox,
        totSox: emission.TotSOx,
        menox: emission.MENOx,
        aenox: emission.AENOx,
        totNox: emission.TotNOx,
        mepm10: emission.MEPM10,
        aepm10: emission.AEPM10,
        totPm10: emission.TotPM10,
        aerco2t2w: emission.AERCO2T2W,
        aerco2ew2w: emission.AERCO2eW2W,
        eeoico2ew2w: emission.EEOICO2eW2W,
        createdAt: new Date(emission.CreatedAt),
        updatedAt: new Date(emission.UpdatedAt),
      },
    })
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })