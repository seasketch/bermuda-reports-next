import { $ } from "zx";

import datasources from "../../project/datasources.json";
import project from "../../project/projectClient.js";

// NEARSHORE HABITAT
// const nearshore = project.getMetricGroup("nearshoreHabitat");
// const datasource = datasources.find(
//   (d) => d.datasourceId === nearshore.datasourceId!,
// );
// console.log(`Reimporting ${nearshore.datasourceId}`);
// if (!datasource) throw new Error(`Datasource ${datasource} not found`);
// const src = datasource?.src;
// const warpDst = "data/dist/" + datasource.datasourceId + "_4326.tif";
// const dst = "data/dist/" + datasource.datasourceId + ".tif";
// await $`gdalwarp -t_srs "EPSG:4326" -dstnodata ${datasource?.noDataValue} --config GDAL_PAM_ENABLED NO --config GDAL_CACHEMAX 500 -wm 500 -multi -wo NUM_THREADS=ALL_CPUS ${src} ${warpDst}`;
// await $`gdal_translate -b ${datasource?.band} -r nearest --config GDAL_PAM_ENABLED NO --config GDAL_CACHEMAX 500 -co COMPRESS=LZW -co NUM_THREADS=ALL_CPUS -of COG -stats ${warpDst} ${dst}`;
// await $`rm ${warpDst}`;
// console.log(`Finished reimporting ${datasource.datasourceId}`);

project.getMetricGroup("ousGear").classes.forEach(async (curClass) => {
  const datasource = datasources.find(
    (d) => d.datasourceId === curClass.datasourceId!,
  );
  console.log(`Reimporting ${curClass.datasourceId}`);
  if (!datasource) throw new Error(`Datasource ${curClass} not found`);
  const src = datasource?.src;
  const warpDst = "data/dist/" + datasource.datasourceId + "_4326.tif";
  const dst = "data/dist/" + datasource.datasourceId + ".tif";
  await $`gdalwarp -t_srs "EPSG:4326" -dstnodata ${datasource?.noDataValue} --config GDAL_PAM_ENABLED NO --config GDAL_CACHEMAX 500 -wm 500 -multi -wo NUM_THREADS=ALL_CPUS ${src} ${warpDst}`;
  await $`gdal_translate -b ${datasource?.band} -r nearest --config GDAL_PAM_ENABLED NO --config GDAL_CACHEMAX 500 -co COMPRESS=LZW -co NUM_THREADS=ALL_CPUS -of COG -stats ${warpDst} ${dst}`;
  await $`rm ${warpDst}`;
  console.log(`Finished reimporting ${datasource.datasourceId}`);
});