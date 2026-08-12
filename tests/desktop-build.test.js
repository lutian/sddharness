// tests/desktop-build.test.js — valida, por leitura estática, a configuração
// de empacotamento Windows (electron-builder) declarada em `package.json`
// (feature-8). Nenhum teste aqui invoca `electron-builder` como processo
// filho, acessa rede ou gera um instalador real (R11) — ver
// specs/feature-8/design.md, Decisão 5.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

// Reaproveita o mesmo mock de "electron" já usado em tests/electron-main.test.js
// (feature-14) para poder importar `resolvePaths` de electron/main.js sem
// tocar no runtime real do Electron (R10, R12: nenhuma modificação em
// electron/main.js).
vi.mock("electron", () => ({
  app: {
    whenReady: vi.fn(() => new Promise(() => {})),
    getPath: vi.fn(() => "/tmp/fake-userdata"),
    isReady: vi.fn(() => true),
  },
  BrowserWindow: vi.fn(),
  ipcMain: { handle: vi.fn() },
  contextBridge: { exposeInMainWorld: vi.fn() },
  ipcRenderer: { invoke: vi.fn(), on: vi.fn(), removeListener: vi.fn() },
  session: {},
}));

vi.mock("../src/db/index.js", () => ({
  openDatabase: vi.fn(),
  updateStatusPedido: vi.fn(),
  atribuirMotoboy: vi.fn(),
}));
vi.mock("../src/whatsapp/index.js", () => ({
  createWhatsAppWebJsAdapter: vi.fn(),
  createWhatsAppClient: vi.fn(),
}));
vi.mock("../src/ai/index.js", () => ({
  createOpenAiChatClient: vi.fn(),
  createDeepSeekChatClient: vi.fn(),
  createOpenAiClient: vi.fn(),
  createHttpMediaFetcher: vi.fn(),
  createPdfConverter: vi.fn(),
  processarMensagemConversa: vi.fn(),
}));
vi.mock("../src/delivery/index.js", () => ({
  createNominatimGeocoder: vi.fn(),
  listarPedidosAtivosComTempoEspera: vi.fn(),
}));
vi.mock("../src/menu/index.js", () => ({
  loadCardapio: vi.fn(),
  loadConfig: vi.fn(),
  saveConfig: vi.fn(),
}));

// Função utilitária local de validação da configuração de empacotamento
// (T8): recebe um objeto `build` e retorna a lista de campos
// ausentes/inválidos. Reutilizada pelos testes positivos (contra o
// package.json real) e negativos (contra objetos incompletos em memória).
function validarConfigBuild(build) {
  const problemas = [];

  if (typeof build?.appId !== "string" || build.appId.length === 0) {
    problemas.push("appId");
  }
  if (typeof build?.productName !== "string" || build.productName.length === 0) {
    problemas.push("productName");
  }

  const files = build?.files;
  const cobreElectron = Array.isArray(files) && files.some((f) => f.startsWith("electron/"));
  const cobreSrc = Array.isArray(files) && files.some((f) => f.startsWith("src/"));
  if (!cobreElectron || !cobreSrc) {
    problemas.push("files");
  }

  const asarUnpack = build?.asarUnpack;
  const cobreBetterSqlite3 =
    Array.isArray(asarUnpack) && asarUnpack.some((entrada) => entrada.includes("better-sqlite3"));
  if (!cobreBetterSqlite3) {
    problemas.push("asarUnpack");
  }

  const target = build?.win?.target;
  const temTargetWindowsValido =
    Array.isArray(target) && target.some((t) => t === "nsis" || t === "msi");
  if (!temTargetWindowsValido) {
    problemas.push("win.target");
  }

  if (temTargetWindowsValido && target.includes("nsis")) {
    if (build?.nsis?.oneClick !== false || build?.nsis?.perMachine !== false) {
      problemas.push("nsis.oneClick/perMachine");
    }
  }

  return problemas;
}

function lerPackageJson() {
  const conteudo = readFileSync(new URL("../package.json", import.meta.url), "utf-8");
  return JSON.parse(conteudo);
}

describe("Empacotamento Windows (electron-builder) — validação estática (R1-R9)", () => {
  it("a configuração de build real do package.json não tem nenhum campo ausente/inválido", () => {
    const pkg = lerPackageJson();

    expect(validarConfigBuild(pkg.build)).toEqual([]);
  });

  it("declara appId e productName válidos em package.json (R2)", () => {
    const pkg = lerPackageJson();

    expect(typeof pkg.build.appId).toBe("string");
    expect(pkg.build.appId.length).toBeGreaterThan(0);
    expect(typeof pkg.build.productName).toBe("string");
    expect(pkg.build.productName.length).toBeGreaterThan(0);
  });

  it("declara files cobrindo electron/ e src/ (R3, R7)", () => {
    const pkg = lerPackageJson();

    expect(pkg.build.files).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^electron\//),
        expect.stringMatching(/^src\//),
      ])
    );
  });

  it("declara asarUnpack para better-sqlite3 (R4)", () => {
    const pkg = lerPackageJson();

    expect(
      pkg.build.asarUnpack.some((entrada) => entrada.includes("better-sqlite3"))
    ).toBe(true);
  });

  it("declara ao menos um target Windows válido (nsis/msi) (R5)", () => {
    const pkg = lerPackageJson();

    const alvosValidos = ["nsis", "msi"];
    expect(pkg.build.win.target.some((t) => alvosValidos.includes(t))).toBe(true);
  });

  it("o target nsis, quando presente, usa oneClick: false e perMachine: false (R6)", () => {
    const pkg = lerPackageJson();

    if (pkg.build.win.target.includes("nsis")) {
      expect(pkg.build.nsis.oneClick).toBe(false);
      expect(pkg.build.nsis.perMachine).toBe(false);
    }
  });

  it("o script dist:win invoca electron-builder --win (R1)", () => {
    const pkg = lerPackageJson();

    expect(pkg.scripts["dist:win"]).toBe("electron-builder --win");
  });

  it("electron-builder está declarado em devDependencies (R1)", () => {
    const pkg = lerPackageJson();

    expect(pkg.devDependencies["electron-builder"]).toBeDefined();
  });
});

describe("Empacotamento Windows — validação de configurações incompletas (R8)", () => {
  const configBase = {
    appId: "com.pizzaria.whatsapp-delivery-desktop",
    productName: "Pizzaria WhatsApp Delivery",
    files: ["electron/**/*", "src/**/*", "package.json"],
    asarUnpack: ["**/node_modules/better-sqlite3/**/*"],
    win: { target: ["nsis"] },
    nsis: { oneClick: false, perMachine: false },
  };

  it("identifica appId ausente", () => {
    const { appId, ...semAppId } = configBase;

    expect(validarConfigBuild(semAppId)).toContain("appId");
  });

  it("identifica productName ausente", () => {
    const { productName, ...semProductName } = configBase;

    expect(validarConfigBuild(semProductName)).toContain("productName");
  });

  it("identifica files ausente/incompleto", () => {
    expect(validarConfigBuild({ ...configBase, files: ["src/**/*"] })).toContain("files");
    expect(validarConfigBuild({ ...configBase, files: undefined })).toContain("files");
  });

  it("identifica asarUnpack sem entrada de better-sqlite3", () => {
    expect(validarConfigBuild({ ...configBase, asarUnpack: [] })).toContain("asarUnpack");
    expect(
      validarConfigBuild({ ...configBase, asarUnpack: ["**/node_modules/outro-pacote/**/*"] })
    ).toContain("asarUnpack");
  });

  it("identifica ausência de target Windows válido (nsis/msi)", () => {
    expect(validarConfigBuild({ ...configBase, win: { target: [] } })).toContain("win.target");
    expect(
      validarConfigBuild({ ...configBase, win: { target: ["dmg"] } })
    ).toContain("win.target");
  });

  it("identifica nsis.oneClick/perMachine incorretos quando o target nsis está presente", () => {
    expect(
      validarConfigBuild({ ...configBase, nsis: { oneClick: true, perMachine: false } })
    ).toContain("nsis.oneClick/perMachine");
    expect(
      validarConfigBuild({ ...configBase, nsis: { oneClick: false, perMachine: true } })
    ).toContain("nsis.oneClick/perMachine");
  });

  it("uma configuração completa e correta não gera nenhum problema", () => {
    expect(validarConfigBuild(configBase)).toEqual([]);
  });
});

describe("Resolução de caminhos de dados em produção (R10, R12)", () => {
  it("cardapioPath, configPath e whatsappSessionPath são subcaminhos de app.getPath('userData')", async () => {
    // Reaproveita resolvePaths de electron/main.js (feature-14, não
    // modificado por esta feature) sem duplicar as demais asserções já
    // feitas por tests/electron-main.test.js.
    const { resolvePaths } = await import("../electron/main.js");
    const electronMock = await import("electron");

    const paths = resolvePaths();
    const userDataPath = electronMock.app.getPath("userData");

    expect(paths.cardapioPath.startsWith(userDataPath)).toBe(true);
    expect(paths.configPath.startsWith(userDataPath)).toBe(true);
    expect(paths.whatsappSessionPath.startsWith(userDataPath)).toBe(true);
  });
});

describe("Inicialização do executável instalado (R13)", () => {
  it("package.json declara main como electron/main.js", () => {
    const pkg = lerPackageJson();

    expect(pkg.main).toBe("electron/main.js");
  });
});
