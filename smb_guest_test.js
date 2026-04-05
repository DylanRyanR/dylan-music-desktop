
const SMB2 = require('@marsaud/smb2');

async function testAnonymousSmb() {
  const server = "192.168.123.231";
  const share = "data";
  console.log(`\n--- Attempting ANONYMOUS connection to \\\\${server}\\${share} ---`);

  const smb2 = new SMB2({
    share: `\\\\\\\\${server}\\\\${share}`,
    // Intentionally leave username, password, and domain blank for anonymous/guest access
    username: '',
    password: '',
    domain: ''
  });

  try {
    const files = await new Promise((resolve, reject) => {
      smb2.readdir('/', (err, files) => {
        if (err) return reject(err);
        resolve(files);
      });
    });

    console.log("SUCCESS! Anonymous/Guest connection was successful.");
    console.log("This means the server allows guest access, and you should leave Username, Password, and Domain fields EMPTY in the player settings.");
    console.log("\nFiles found:");
    files.forEach(file => console.log(`- ${file}`));
    return true;

  } catch (err) {
    console.error(`Anonymous connection failed: ${err.message}`);
    console.log("\nThis confirms that the server requires authentication and is not in a simple guest mode.");
    console.log("The issue remains with the specific user credentials (dylan) or server-side permissions.");
    return false;
  }
}

testAnonymousSmb();
