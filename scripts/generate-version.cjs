const fs = require('fs');
const path = require('path');

// 讀取 package.json
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const version = packageJson.version;
const productName = packageJson.build?.productName || packageJson.name;
// 預設安裝檔名格式: "下午茶 Setup 1.0.1.exe"
// 注意: 這裡必須跟 electron-builder 的 artifactName 設定一致，預設通常是 "${productName} Setup ${version}.${ext}"
const installerName = `${productName} Setup ${version}.exe`;

const releaseNotes = packageJson.releaseNotes || '版本更新';

const versionData = {
  version: version,
  installerName: installerName,
  releaseNotes: releaseNotes,
  buildTime: new Date().toISOString()
};

// 輸出到 release 資料夾
const outputDir = path.join(__dirname, '../release');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'version.json');
fs.writeFileSync(outputPath, JSON.stringify(versionData, null, 2), 'utf8');

console.log(`✅ Successfully generated version.json at ${outputPath}`);
console.log(`   Version: ${version}`);
console.log(`   Installer: ${installerName}`);
console.log(`   Notes: ${releaseNotes}`);
