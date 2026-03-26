// My objetive is to create a couple of tests for the checkout page once the user is logged in. 
// I need to set the playwright config to use the storage state file. It will sever as the baseline for other tests.

import { test, expect } from '../../fixtures/index.fixtures'
import data from '../../data/test.json'

test.describe('Checkout Test Suite', () => {

    test('testing', async ({ page }) => {
        await page.goto('https://storedemo.testdino.com/checkout')
        await page.waitForTimeout(10000)
    })

    test('testing 2', async ({ page }) => {
        await page.goto('https://storedemo.testdino.com/checkout')
        await page.waitForTimeout(10000)
        console.log(data.test)
    })
})