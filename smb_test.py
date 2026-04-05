
import smbprotocol.exceptions
from smbprotocol.connection import Connection, Dialects
from smbprotocol.session import Session
from smbprotocol.tree import TreeConnect
import uuid

def test_smb_connection(server, share, username, password, domain=None):
    print(f"\\n--- Testing with user: '{domain}\\\\{username}' ---")
    conn = None
    session = None
    tree = None

    # smbprotocol expects the domain and username to be combined
    full_username = f"{domain}\\{username}" if domain else username

    try:
        client_guid = uuid.uuid4()
        conn = Connection(client_guid, server)
        conn.connect(Dialects.SMB_3_1_1)
        print(f"Successfully connected to {server}!")

        session = Session(conn, full_username, password)
        session.connect()
        print("Authentication successful!")

        tree = TreeConnect(session, f"\\\\{server}\\{share}")
        tree.connect()
        print(f"Successfully connected to share '{share}'!")

        print("\\nFiles in the root of the share:")
        # Corrected method name from list_path to list
        files = tree.list(share, "*")
        for f in files:
            print(f"- {f.get_short_name()}")

        print(f"\\nSUCCESS! The correct configuration is:")
        print(f"  Host: {server}")
        print(f"  Share: {share}")
        print(f"  Username: {username}")
        print(f"  Domain: {domain or ''}")
        return True

    except smbprotocol.exceptions.LogonFailure as e:
        print(f"Authentication failed: {e}")
    except smbprotocol.exceptions.SMBException as e:
        print(f"An SMB error occurred: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        if tree:
            tree.disconnect()
        if session:
            # Corrected method name from logoff to close
            session.close()
        if conn:
            conn.disconnect()
    return False

if __name__ == "__main__":
    SERVER = "192.168.123.231"
    SHARE = "data"
    USERNAME = "dylan"
    PASSWORD = "123456"

    # Attempt 1: No domain (just username)
    if test_smb_connection(SERVER, SHARE, USERNAME, PASSWORD, domain=None):
        exit(0)

    # Attempt 2: Domain as server name
    if test_smb_connection(SERVER, SHARE, USERNAME, PASSWORD, domain=SERVER):
        exit(0)

    # Attempt 3: Domain as 'WORKGROUP'
    if test_smb_connection(SERVER, SHARE, USERNAME, PASSWORD, domain='WORKGROUP'):
        exit(0)

    print("\\nAll connection attempts failed.")
