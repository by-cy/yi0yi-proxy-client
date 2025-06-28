➜  yi0yi-proxy-client git:(feature/clerk-implementation) ✗ ~/.cargo/bin/cargo-tauri signer generate -w ~/.tauri/yi0yi-proxy.key                                        ~/.cargo/bin/cargo-tauri signer generate -w ~/.tauri/yi0yi-proxy.key
Please enter a password to protect the secret key.
Password: 
Password (one more time): 
Deriving a key from the password in order to encrypt the secret key... done

Your keypair was generated successfully
Private: /Users/nightfurukawa/.tauri/yi0yi-proxy.key (Keep it secret!)
Public: /Users/nightfurukawa/.tauri/yi0yi-proxy.key.pub
---------------------------

Environment variables used to sign:
`TAURI_SIGNING_PRIVATE_KEY`  Path or String of your private key
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`  Your private key password (optional)

ATTENTION: If you lose your private key OR password, you'll not be able to sign your update package and updates will not work.