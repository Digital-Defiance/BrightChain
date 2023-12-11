1) The quorum itself should be composed of a reasonable number of people/organizations (approximately 2 dozen)- ideally charitable organizations with a board.
2) You post secret data with your regular id and sign it- you zero out the ID portion.
3) The server accepts the signature as it is able to verify it was made with the original, known ID of the user, then the secret data (anything) is encrypted with random key.
4) The key is split with shamir's secret sharing and set up to require, mathematically, a certain number of shard-holders to agree to decrypt the data.
5) The quorum keeps the encrypted and unrecoverable copy of the data and the shards are encrypted with each shard-holder's keys, only unlockable with their seed phrase. (there are different key pairs for signing and encryption, and most encryption except the keys themselves is done with symmetric encryption).
6) The user is allowed to post, provided they're not in trouble already, and
  - if nothing happens (multiple reports of illegal content, etc) during the statute of limitations period, then the anonymity remains and the encrytped but stored ID data is purged.
  - If there are multiple reports against the user of something serious, the quorum (which you've hopefully picked carefully) then has to vote to unseal the record to mark the original account in violation.
