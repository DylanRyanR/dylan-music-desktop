
const SMB2 = require('@marsaud/smb2');

async function testSmbConnection(server, share, username, password, domain) {
  console.log(`\n--- Testing with Domain: ${domain || 'None'} ---`);
  const smb2 = new SMB2({
    share: `\\\\\\\\${server}\\\\${share}`,
    domain: domain || '',
    username: username,
    password: password,
    autoCloseTimeout: 0
  });

  try {
    const files = await new Promise((resolve, reject) => {
      smb2.readdir('/', (err, files) => {
        if (err) return reject(err);
        resolve(files);
      });
    });

    console.log("Connection and authentication successful!");
    console.log("\nFiles in the root of the share:");
    files.forEach(file => console.log(`- ${file}`));

    console.log(`\nSUCCESS! The correct configuration is:`);
    console.log(`  Host: ${server}`);
    console.log(`  Share: ${share}`);
    console.log(`  Username: ${username}`);
    console.log(`  Domain: ${domain || ''}`);
    return true;

  } catch (err) {
    console.error(`Failed to connect: ${err.message}`);
    return false;
  }
}

async function runTests() {
    const SERVER = "192.168.123.231";
    const SHARE = "data";
    const USERNAME = "dylan";
    const PASSWORD = "123456";

    // Attempt 1: No domain
    if (await testSmbConnection(SERVER, SHARE, USERNAME, PASSWORD, null)) {
        return;
    }

    // Attempt 2: Domain as server name
    if (await testSmbConnection(SERVER, SHARE, USERNAME, PASSWORD, SERVER)) {
        return;
    }

    // Attempt 3: Domain as 'WORKGROUP'
    if (await testSmbConnection(SERVER, SHARE, USERNAME, PASSWORD, 'WORKGROUP')) {
        return;
    }

    console.log("\nAll connection attempts failed.");
}

runTests();
