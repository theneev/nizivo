import { firefox } from "playwright-core";
try { const b = await firefox.launch(); console.log("FF OK", b.version()); await b.close(); } catch (e) { console.log(e.message.split("\n").slice(0,8).join("\n")); }
