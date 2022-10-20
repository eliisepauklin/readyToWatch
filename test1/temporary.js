const bcrypt = require('bcrypt')
const saltRounds = 10

const ADMIN_PASSWORD = 'Eliise123'
//const someOtherPassword = 'helloo123'

const hash = bcrypt.hashSync(ADMIN_PASSWORD, saltRounds)

console.log(hash)
