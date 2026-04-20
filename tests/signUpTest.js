const {Builder,By,Key} = require ("selenium-webdriver");

async function singUp() {
    // Abrir el navegador
    let driver = await new Builder().forBrowser("chrome").build();
    // Abrir pagina
    await driver.get("http://localhost:3005/");
    await driver.sleep(1000);
    // Ingresar a la pagina de registros
    await driver.findElement(By.xpath("/html/body/div/div[1]/div/div[2]/a[2]")).click();
    await driver.sleep(1000);
    // Crear un usuario
    await driver.findElement(By.xpath("/html/body/div/div[2]/div/div[1]/div/input[1]")).sendKeys("UsuarioTest",Key.RETURN)
    await driver.findElement(By.xpath("/html/body/div/div[2]/div/div[1]/div/input[2]")).sendKeys("Test@sitio.cl",Key.RETURN)
    await driver.findElement(By.xpath("/html/body/div/div[2]/div/div[1]/div/input[3]")).sendKeys("12341234",Key.RETURN)
    await driver.findElement(By.xpath("/html/body/div/div[2]/div/div[1]/div/input[4]")).sendKeys("12341234",Key.RETURN)
    await driver.sleep(1000);
    await driver.findElement(By.xpath("/html/body/div/div[2]/div/div[1]/div/button")).click();
    await driver.sleep(1000);
    // Ingresar con usuario creado
    await driver.findElement(By.xpath("/html/body/div/div[1]/div/div[2]/a[1]")).click();
    await driver.findElement(By.xpath("/html/body/div/div[2]/div/div[1]/div/input[1]")).sendKeys("Test@sitio.cl",Key.RETURN)
    await driver.findElement(By.xpath("/html/body/div/div[2]/div/div[1]/div/input[2]")).sendKeys("12341234",Key.RETURN)
    await driver.sleep(1000);
    await driver.findElement(By.xpath("/html/body/div/div[2]/div/div[1]/div/button")).click();
    await driver.sleep(5000);
    // Salir del navegador
    await driver.quit;
}

singUp()