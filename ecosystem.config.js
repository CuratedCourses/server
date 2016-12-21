module.exports = {
  apps : [{
    name        : "app",
    script      : "./app.js",
    instances   : "max",
    exec_mode   : "cluster",      
    watch       : true,
    env: {
      "NODE_ENV": "development",
    },
    env_production : {
       "NODE_ENV": "production"
    }
  }]
}
