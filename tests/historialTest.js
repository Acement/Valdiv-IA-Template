const { Builder, By, Key, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const HEADLESS = process.env.HEADLESS === "1";

async function historyTest() {
  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(
      new chrome.Options()
        .addArguments("--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage")
        .addArguments(...(HEADLESS ? ["--headless=new"] : []))
    )
    .build();

  const baseUrl = "http://localhost:3005";
  const email = process.env.TEST_USER_EMAIL || "Test@sitio.cl";
  const password = process.env.TEST_USER_PASSWORD || "12341234";
  const message = `HistTest-${Date.now().toString().slice(-6)}`;

  try {
    await driver.get(`${baseUrl}/login`);

    await driver.findElement(By.name("email")).sendKeys(email);
    await driver.findElement(By.name("password")).sendKeys(password);
    await driver.findElement(By.xpath("//button[normalize-space()='Entrar']")).click();

    await driver.wait(until.urlContains("/chat"), 15000);

    const assistantBefore = (await driver.findElements(By.xpath("//img[@alt='Asistente']"))).length;

    await driver
      .findElement(By.css('textarea[placeholder="Escribe tu mensaje..."]'))
      .sendKeys(message, Key.ENTER);

    await driver.wait(until.elementLocated(By.xpath(`//*[normalize-space()='${message}']`)), 15000);

    await driver.wait(async () => {
      const thinking = await driver.findElements(By.xpath("//*[normalize-space()='Pensando...']"));
      return thinking.length === 0;
    }, 60000, "El chatbot sigue pensando");

    const historyOpen =
      (await driver.findElements(By.xpath("//p[normalize-space()='Historial']")).length) > 0;

    if (!historyOpen) {
      const sidebarButton = await driver.findElement(By.xpath("//nav//button[1]"));
      await driver.executeScript("arguments[0].click();", sidebarButton);
      await driver.wait(until.elementLocated(By.xpath("//p[normalize-space()='Historial']")), 10000);
    }

    await driver.wait(
      until.elementLocated(By.xpath(`//nav//button//p[starts-with(normalize-space(), '${message}')]`)),
      15000
    );

    console.log(`OK: '${message}' aparece en el historial del sidebar.`);
  } catch (error) {
    console.error("Error occurred:", error);
    process.exitCode = 1;
  }
}

historyTest();