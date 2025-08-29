import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const AucEngine = await hre.ethers.getContractFactory("AucEngine");
  const aucEngine = await AucEngine.deploy();
  await aucEngine.waitForDeployment();

  const address = await aucEngine.getAddress();
  console.log("AucEngine deployed to:", address);

  const artifact = await hre.artifacts.readArtifact("AucEngine");
  const config = { address, abi: artifact.abi };

  const outPath = path.resolve(__dirname, "..", "..", "web", "wwwroot", "contractConfig.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2));
  console.log("Wrote config to:", outPath);
}

main().catch((e) => { console.error(e); process.exit(1); });
