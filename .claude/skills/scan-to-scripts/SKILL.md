---
<<<<<<< HEAD:.claude/skills/scan-to-scripts/SKILL.md
name: scan-to-scripts
description: Scans a live web page with playwright-cli, discovers its interactive elements, and generates a page object, fixture entry, and spec file following the project's architecture rules. Invoke when the user provides a URL or path and asks to generate tests for it.
=======
name: scan-to-tests
description: >
  Escanea una página web con playwright-cli, descubre sus elementos interactivos,
  y genera el page object, fixture entry y spec file siguiendo las reglas de
  playwright-architecture. Invocar cuando el usuario da una URL o ruta y pide
  generar tests para ella.
>>>>>>> parent of 9ac0813 (update skill architecture for playwright development):.claude/skills/scan-to-tests/SKILL.md
---

# scan-to-scripts

<<<<<<< HEAD:.claude/skills/scan-to-scripts/SKILL.md
Orchestrates two skills in sequence:
1. **playwright-cli** — live browser scan to discover elements
2. **playwright-create-test** — code generation following the project's architecture rules

Architecture rules are always active via `CLAUDE.md` — no need to re-declare them here.

---

## Memory Check

Before starting, read `.claude/skills/memory/scan-to-scripts.md` (if it exists).
Apply any recorded learnings to this session.
=======
Orquesta dos skills en secuencia:
1. **playwright-cli** — scan en vivo del browser para descubrir elementos
2. **playwright-architecture** — generación de código siguiendo las reglas del proyecto
>>>>>>> parent of 9ac0813 (update skill architecture for playwright development):.claude/skills/scan-to-tests/SKILL.md

---

## Input

El usuario provee uno de:
- URL completa: `https://www.saucedemo.com/inventory.html`
- Ruta relativa al baseURL en `playwright.config.js`: `/inventory.html`

Si el input es una ruta, prepende `https://www.saucedemo.com` para formar la URL completa.

---

## Mapa de archivos del proyecto

```
playwright-for-ui/
├── pages/                   ← Page Object classes, uno por página
├── utils/e2e.js             ← Clase E2E multi-step (agrega page objects)
├── fixtures/
│   ├── page.fixtures.js     ← Wires cada PageObject via base.extend()
│   ├── e2e.fixtures.js      ← Wire la clase E2E
│   └── index.fixtures.js    ← mergeTests() — ÚNICO import source en specs
├── tests/
│   ├── *.spec.js            ← Page Object style (tests de una sola página)
│   └── e2e/*.spec.js        ← E2E style (flujos multi-página)
└── data/test.json           ← Test data compartida (sin credentials)
```

---

## FASE 1 — Scan de la página

### Paso 1.1 — Abrir browser y navegar

Usa el skill `playwright-cli` para navegar a la URL y obtener un snapshot de los elementos:

```
Invoca playwright-cli:
  - Navegar a <FULL_URL>
  - Tomar snapshot de la página
  - Evaluar document.title y el contenido del h1
  - Tomar screenshot para referencia visual
```

El snapshot retorna líneas con este formato:
```
e1  [textbox "Username"]
e2  [textbox "Password"]
e3  [button "Login"]
e4  [heading "Swag Labs" level=1]
e5  [link "Forgot password?"]
```

### Paso 1.2 — Detectar autenticación requerida

Visita la URL directamente. Si la URL resultante es `/` o `/#/` y el snapshot contiene un `[textbox "Username"]` en lugar del contenido esperado → `REQUIRES_AUTH = true`.

Si la página carga normalmente → `REQUIRES_AUTH = false`.

### Paso 1.3 — Construir inventario de elementos

Para cada elemento del snapshot, registra:

| Campo | Cómo obtenerlo |
|-------|---------------|
| Role | La etiqueta entre corchetes: `textbox`, `button`, `link`, `heading`, `checkbox`, `combobox`, `img` |
| Accessible name | El string entre comillas: `"Add to cart"`, `"Username"` |
| data-testid | El atributo `data-testid="..."` si está presente |

**Categorías a capturar (elementos testables):**
- Inputs: `textbox`, `searchbox`, `spinbutton`, `combobox`, `checkbox`, `radio`, `switch`
- Acciones: `button`, `link`, `menuitem`, `tab`
- Landmarks de contenido: `heading`, `img` (con alt text), `status`, `alert`

Ignora elementos puramente estructurales (`generic`, `none`, `presentation`) a menos que tengan `data-testid`.

### Paso 1.4 — Entender el propósito de la página

Responde estas preguntas antes de continuar:
1. ¿Cuál es la acción principal del usuario en esta página? (submit form, browsing, checkout step, etc.)
2. ¿Cuáles son los 2–5 flujos más importantes? (happy path, error states, edge cases)
3. ¿Es una pantalla standalone o un paso en un flujo multi-página?

### Paso 1.5 — Verificar si ya existe un page object

Antes de generar código, revisa si ya existe un page object para esta ruta:
- Lee el directorio `pages/`
- Lee `fixtures/page.fixtures.js` para ver qué está wired

Si ya existe, ve directamente al Paso 2.3 — solo agrega locators y action methods faltantes.

### Paso 1.6 — Cerrar browser

Cierra el browser via playwright-cli.

---

## FASE 2 — Generación de código

Usa el inventario de la Fase 1. Sigue todas las reglas de esta sección al pie de la letra.

---

### Paso 2.1 — Derivar nombres desde la URL

De la URL, deriva:
- `<pagename>`: lowercase, hyphen-separated. Ej: `inventory`, `cart`, `product-detail`, `checkout-step-one`
- `<PageName>`: PascalCase. Ej: `Inventory`, `Cart`, `ProductDetail`, `CheckoutStepOne`
- `<pageName>`: camelCase (nombre del fixture). Ej: `inventoryPage`, `cartPage`, `productDetailPage`

---

### Paso 2.2 — Crear el Page Object

**Archivo:** `pages/<pagename>.js`

```javascript
// @ts-check
import { test } from '@playwright/test';

export class <PageName>Page {

    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.url = '<route>';            // ej: '/inventory.html'

        // --- Locators (un property por elemento interactivo) ---
        this.heading = page.getByRole('heading', { name: 'Page Title' }).describe('Page Title heading');
        this.someButton = page.getByRole('button', { name: 'Label' }).describe('Label button');
        this.someInput = page.getByRole('textbox', { name: 'Label' }).describe('Label input field');
    }

    async load() {
        await this.page.goto(this.url);
    }

    async waitLoad() {
        await test.step('Wait for <PageName> page to load', async () => {
            await this.<anchorElement>.waitFor({ state: 'visible' });
        });
    }

    // --- Action methods (solo interacción, cero assertions) ---
    async <actionName>(<params>) {
        await this.<input>.fill(<param>);
        await this.<submitButton>.click();
    }
}
```

**Tabla de mapeo de snapshot elements a locators (prioridad de arriba abajo):**

| Snapshot element | Locator preferido | Fallback |
|-----------------|------------------|---------|
| `[textbox "Label"]` | `page.getByRole('textbox', { name: 'Label' })` | `page.getByLabel('Label')` |
| `[button "Label"]` | `page.getByRole('button', { name: 'Label' })` | `page.locator('[data-testid="..."]')` |
| `[link "Label"]` | `page.getByRole('link', { name: 'Label' })` | `page.getByText('Label')` |
| `[heading "Label" level=N]` | `page.getByRole('heading', { name: 'Label' })` | — |
| `[checkbox "Label"]` | `page.getByRole('checkbox', { name: 'Label' })` | `page.getByLabel('Label')` |
| `[combobox "Label"]` | `page.getByRole('combobox', { name: 'Label' })` | `page.getByLabel('Label')` |
| `[img "alt text"]` | `page.getByRole('img', { name: 'alt text' })` | `page.getByAltText('alt text')` |
| Solo tiene data-testid | `page.locator('[data-testid="<id>"]')` | — |
| Sin role ni testid | `page.getByText('texto visible', { exact: true })` | — |

**Regla `.describe()`:** Siempre cadena `.describe('<Accessible Name> <role>')`:
- `'Login button'`, `'Username input field'`, `'Products heading'`, `'Add to cart button'`

**Regla de `waitLoad()`:** Usa el elemento más confiable para indicar que la página cargó completamente — típicamente el heading principal o el CTA primario. No uses spinners ni contenedores genéricos.

**Reglas para action methods:**
- Un método por interacción de usuario distinta
- Acepta todos los datos variables como parámetros — nunca hard-code strings
- Sin `expect()`. Sin `page.waitForURL()`. Sin `waitFor()` a menos que sea guard interno.
- Nomenclatura: verbo + sustantivo: `submitLoginForm`, `addItemToCart`, `applyFilter`

---

### Paso 2.3 — Wire en `fixtures/page.fixtures.js`

Abre `fixtures/page.fixtures.js` y agrega:

1. Import al inicio del archivo:
```javascript
import { <PageName>Page } from '../pages/<pagename>';
```

2. Nueva entrada dentro de `base.extend({...})`:
```javascript
<pageName>Page: async ({ page }, use) => {
    await use(new <PageName>Page(page));
},
```

`fixtures/index.fixtures.js` lo recoge automáticamente via `mergeTests()` — NO toques ese archivo.

---

### Paso 2.4 — Decidir estilo de tests

| Condición de Fase 1 | Estilo | Ubicación del spec |
|---------------------|--------|--------------------|
| `REQUIRES_AUTH = false` Y página standalone | **Page Object style** | `tests/<pagename>.spec.js` |
| `REQUIRES_AUTH = true` Y es paso en flujo multi-página | **E2E style** | `tests/e2e/<pagename>.spec.js` |
| `REQUIRES_AUTH = true` Y puede visitarse directamente post-login | **Ambos** — Page Object spec para elementos, E2E spec para flujo completo | Ambas ubicaciones |

---

### Paso 2.5 — Actualizar `utils/e2e.js` (solo E2E style)

Solo cuando `REQUIRES_AUTH = true` o la página es parte de un flujo multi-step:

1. Agrega el import:
```javascript
import { <PageName>Page } from '../pages/<pagename>';
```

2. Instancia en el constructor de `E2E`:
```javascript
this.<pageName>Page = new <PageName>Page(page);
```

3. Si la página es un **paso** en un flujo existente, agrega un workflow method:
```javascript
async <flowName>() {
    await this.<pageName>Page.load();
    await this.<pageName>Page.waitLoad();
    await this.<pageName>Page.<action>(<params>);
    // Bridge guard — confirma transición de página, NO es una test assertion:
    await expect(this.<nextPage>.someElement).toBeVisible();
}
```

El bridge guard con `expect()` solo está permitido aquí cuando el método causa una transición de página y el caller necesita saber que la transición ocurrió.

---

### Paso 2.6 — Escribir el spec file

**Page Object style — `tests/<pagename>.spec.js`:**

```javascript
import { test, expect } from '../fixtures/index.fixtures'

test.describe('<PageName> Test Suite', () => {

    test.beforeEach(async ({ <pageName>Page }) => {
        await test.step('Load <pageName> page', async () => {
            await <pageName>Page.load()
            await <pageName>Page.waitLoad()
        })
    })

    test('should display page elements', async ({ <pageName>Page }) => {
        await expect(<pageName>Page.<heading>).toBeVisible()
    })

    test('should <descripción de acción primaria>', async ({ <pageName>Page }) => {
        await <pageName>Page.<actionMethod>(<testData>)
        await expect(<pageName>Page.<resultLocator>).<matcher>()
    })

})
```

**E2E style — `tests/e2e/<pagename>.spec.js`:**

```javascript
import { test, expect } from '../../fixtures/index.fixtures'

test.describe('<PageName> E2E Suite', () => {

    test.beforeEach(async ({ e2e }) => {
        await e2e.login()
    })

    test('should <descripción post-login>', async ({ <pageName>Page }) => {
        await <pageName>Page.load()
        await <pageName>Page.waitLoad()
        await expect(<pageName>Page.<locator>).<matcher>()
    })

})
```

**Regla de import path — nunca confundir:**
- `tests/*.spec.js` → `'../fixtures/index.fixtures'`
- `tests/e2e/*.spec.js` → `'../../fixtures/index.fixtures'`

**Guía de assertions — qué assertar:**

| Tipo de elemento | Assertion recomendada |
|-----------------|----------------------|
| Heading/label visible | `await expect(<pageName>Page.heading).toBeVisible()` |
| Input después de fill | `await expect(<pageName>Page.input).toHaveValue('...')` |
| URL después de navegación | `await expect(<pageName>Page.page).toHaveURL(/regex/)` |
| Mensaje de error | `await expect(<pageName>Page.errorMessage).toBeVisible()` |
| Estado de botón | `await expect(<pageName>Page.button).toBeEnabled()` / `.toBeDisabled()` |
| Badge/contador | `await expect(<pageName>Page.badge).toHaveText('N')` |
| Lista de items | `await expect(<pageName>Page.itemList).toHaveCount(N)` |

**Naming convention de tests:** `'should <verbo> <sustantivo> <calificador>'`
- `'should display all inventory items'`
- `'should show error for empty username'`
- `'should redirect to inventory after login'`

---

### Paso 2.7 — Agregar test data si aplica

Si los tests necesitan datos dinámicos (nombres de productos, cantidades, mensajes de error esperados), agrega entradas a `data/test.json`:

```json
{
  "<pagename>": {
    "<key>": "<value>"
  }
}
```

Import en el spec:
- Desde `tests/*.spec.js`: `import data from '../data/test.json'`
- Desde `tests/e2e/*.spec.js`: `import data from '../../data/test.json'`

**NUNCA** pongas credentials en `test.json`. Las credentials siempre van de `process.env.email` y `process.env.password`.

---

## FASE 3 — Verificación

### Paso 3.1 — Ejecutar los tests generados

```bash
pnpm exec playwright test tests/<pagename>.spec.js --project=chromium
```

Para E2E:
```bash
pnpm exec playwright test tests/e2e/<pagename>.spec.js --project=chromium
```

### Paso 3.2 — Interpretar fallos

| Tipo de fallo | Causa probable | Fix |
|--------------|---------------|-----|
| Element not found | El locator no matchea el DOM real | Re-scan con playwright-cli snapshot; actualizar selector |
| `waitLoad()` timeout | Anchor element equivocado | Cambiar `waitLoad()` a un elemento más confiable |
| Import error | Path incorrecto a fixtures | Verificar si el spec está en `tests/` o `tests/e2e/` y ajustar |
| Fixture not found | Page object no wired en `page.fixtures.js` | Agregar import y fixture entry |
| URL mismatch | `this.url` incorrecto en page object | Comparar con el baseURL de `playwright.config.js` |

### Paso 3.3 — Re-scan si hay fallos de selector

Si los tests fallan y la causa no es clara, re-abre el browser:

```
Invoca playwright-cli:
  - Navegar a <FULL_URL>
  - Tomar screenshot para ver el estado visual
  - Tomar nuevo snapshot para comparar selectores
  - Cerrar browser
```

---

## Reglas de Arquitectura (inline — no consultar el skill playwright-architecture)

Estas son las reglas no-negociables. Violar cualquiera produce output incorrecto.

### Regla A: Sin assertions en page objects o E2E utils

Page objects interactúan. Los tests assertan.

```javascript
// MAL — assertion dentro de action method
async addToCart() {
    await this.addButton.click();
    await expect(this.cartBadge).toHaveText('1'); // VIOLACIÓN
}

// BIEN
async addToCart() {
    await this.addButton.click();
}
```

La única `expect()` permitida en page objects o E2E utils es el bridge guard de navegación dentro de `waitLoad()` o un workflow method multi-step, wrapeado en `test.step()`.

### Regla B: Page objects importan `test` de `@playwright/test`

Los page objects usan `test.step()` dentro de `waitLoad()`. Esto requiere importar `test` de `@playwright/test` — no de los fixtures. Este es el único lugar donde un import directo de Playwright es correcto.

```javascript
// CORRECTO en pages/*.js
import { test } from '@playwright/test';
```

### Regla C: Specs nunca importan de `@playwright/test`

```javascript
// MAL
import { test, expect } from '@playwright/test'

// BIEN en tests/*.spec.js
import { test, expect } from '../fixtures/index.fixtures'

// BIEN en tests/e2e/*.spec.js
import { test, expect } from '../../fixtures/index.fixtures'
```

### Regla D: Siempre `load()` + `waitLoad()` en `beforeEach`

```javascript
// MAL — flaky
await <pageName>Page.load()

// BIEN
await <pageName>Page.load()
await <pageName>Page.waitLoad()
```

### Regla E: Nunca hard-code credentials

```javascript
// MAL
await loginPage.submitLoginInForm('standard_user', 'secret_sauce')

// BIEN
await loginPage.submitLoginInForm(process.env.email, process.env.password)
```

### Regla F: Nunca `page.goto()` directamente en specs

```javascript
// MAL
test('...', async ({ page }) => {
    await page.goto('/inventory.html')
})

// BIEN
test('...', async ({ inventoryPage }) => {
    await inventoryPage.load()
})
```

### Regla G: Toda clase en `pages/` debe tener fixture entry

Cada `pages/<pagename>.js` debe tener su entrada correspondiente en `fixtures/page.fixtures.js`. Nunca dejes este paso incompleto.

---

## Ejemplo completo

**Input:** `/inventory.html` (REQUIRES_AUTH = true)

**Scan produce:**
```
e1  [heading "Products" level=3]
e2  [button "Add to cart"]
e3  [button "Open Menu"]
e4  [link "Twitter"]
```

**Fase 2 genera:**

`pages/inventory.js`:
```javascript
// @ts-check
import { test } from '@playwright/test';

export class InventoryPage {

    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.url = '/inventory.html';
        this.heading = page.getByRole('heading', { name: 'Products' }).describe('Products heading');
        this.menuButton = page.getByRole('button', { name: 'Open Menu' }).describe('Open Menu button');
    }

    async load() {
        await this.page.goto(this.url);
    }

    async waitLoad() {
        await test.step('Wait for Inventory page to load', async () => {
            await this.heading.waitFor({ state: 'visible' });
        });
    }

    async openMenu() {
        await this.menuButton.click();
    }
}
```

`fixtures/page.fixtures.js` — agrega:
```javascript
import { InventoryPage } from '../pages/inventory';
// dentro de base.extend():
inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
},
```

`utils/e2e.js` — agrega (porque REQUIRES_AUTH = true):
```javascript
import { InventoryPage } from '../pages/inventory';
// en el constructor:
this.inventoryPage = new InventoryPage(page);
```

`tests/e2e/inventory.spec.js`:
```javascript
import { test, expect } from '../../fixtures/index.fixtures'

test.describe('Inventory E2E Suite', () => {

    test.beforeEach(async ({ e2e }) => {
        await e2e.login()
    })

    test('should display products heading after login', async ({ inventoryPage }) => {
        await inventoryPage.load()
        await inventoryPage.waitLoad()
        await expect(inventoryPage.heading).toBeVisible()
    })

})
```

---

## Checklist final

Antes de terminar, verifica todo esto:

<<<<<<< HEAD:.claude/skills/scan-to-scripts/SKILL.md
- [ ] `pages/<pagename>.js` exists with constructor, `load()`, `waitLoad()`, and at least one action method
- [ ] All locators use `getByRole()` or `getByLabel()` with `.describe()` chained
- [ ] No `expect()` inside page object methods (except bridge guard inside `test.step()`)
- [ ] `fixtures/page.fixtures.js` has the import and fixture entry for the new page
- [ ] Spec imports from `../fixtures/index.fixtures` or `../../fixtures/index.fixtures` (never from `@playwright/test`)
- [ ] `beforeEach` uses `load()` + `waitLoad()`
- [ ] No hard-coded credentials in any file
- [ ] No direct `page.goto()` calls in specs
- [ ] `utils/e2e.js` updated if `REQUIRES_AUTH = true` or page is part of a flow
- [ ] Tests pass: `pnpm exec playwright test <spec-file> --project=chromium`

---

## Memory Update

After completing the task, if you discovered anything new about this project
(a selector pattern, an auth behavior, a page structure, a gotcha), append it
to `.claude/skills/memory/scan-to-scripts.md` in the appropriate section.
Only record things that are non-obvious and would save future effort.
=======
- [ ] `pages/<pagename>.js` existe con constructor, `load()`, `waitLoad()`, y al menos un action method
- [ ] Todos los locators usan `getByRole()` o `getByLabel()` con `.describe()` encadenado
- [ ] Sin `expect()` dentro de métodos de page object (salvo bridge guard en `test.step()`)
- [ ] `fixtures/page.fixtures.js` tiene el import y la fixture entry para la nueva página
- [ ] El spec importa de `../fixtures/index.fixtures` o `../../fixtures/index.fixtures` (nunca de `@playwright/test`)
- [ ] `beforeEach` usa `load()` + `waitLoad()`
- [ ] Sin credentials hard-coded en ningún archivo
- [ ] Sin llamadas directas a `page.goto()` en specs
- [ ] `utils/e2e.js` actualizado si `REQUIRES_AUTH = true` o la página es parte de un flujo
- [ ] Los tests pasan: `pnpm exec playwright test <spec-file> --project=chromium`
>>>>>>> parent of 9ac0813 (update skill architecture for playwright development):.claude/skills/scan-to-tests/SKILL.md
