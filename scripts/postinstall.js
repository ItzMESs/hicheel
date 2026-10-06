// npm install-ийн дараа Prisma client үүсгэж, DATABASE_URL байвал хүснэгтүүдийг санд үүсгэнэ/шинэчилнэ.
const { execSync } = require("child_process");
const run = (cmd) => execSync(cmd, { stdio: "inherit" });
run("npx prisma generate");
if (process.env.DATABASE_URL) {
  try { run("npx prisma db push --skip-generate"); }
  catch (e) { console.warn("⚠️  prisma db push амжилтгүй — DATABASE_URL-ээ шалгана уу."); }
} else {
  console.log("ℹ️  DATABASE_URL тохируулаагүй тул db push алгаслаа (сайт локал горимоор ажиллана).");
}
