const bcrypt = require('bcrypt'); 

const hashPassword = async(password)=>{ 
  const rawRounds = process.env.BCRYPT_ROUNDS || 10;
  const saltRounds = parseInt(rawRounds, 10); 
  if(isNaN(saltRounds)){ 
    throw new Error('Invalid salt rounds: must be a number')
  }; 

  const hashedPassword = await bcrypt.hash(password, saltRounds); 

  return hashedPassword; 
}


module.exports = hashPassword; 