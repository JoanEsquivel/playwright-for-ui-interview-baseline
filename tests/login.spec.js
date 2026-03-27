
// Clickear login y verificar mensajes de warning  ✅
// Ingresar un email invalido y verificar mensaje de error
// Ingresar un password invalido y verificar mensaje de error
// Ingresar un email y password invalidos y verificar mensaje de error
// Ingresar un email y password validos y verificar que se redirige a la pagina de inicio ✅

import { test, expect } from '../fixtures/index.fixtures'

test.describe('Login Test Suite', () => {
    test.beforeEach(async ({ loginPage }) => {
        await test.step('Load login page', async () => {
            await loginPage.load()
            await loginPage.waitLoad()
        })
    })
    test('should login successfully', async ({ loginPage }) => {
        await loginPage.submitLoginInForm(process.env.email, process.env.password)
    })
})
