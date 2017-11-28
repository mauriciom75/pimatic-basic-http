var bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

module.exports = function(env) {
  var BasicHttp, BasicHttpActionHandler, BasicHttpActionProvider, BasicHttpSensor, BasicHttpSensor2, BasicHttpSwitch, Client, M, Promise, assert, client, cliopts, commons, exec, plugin, settled, transformError, util;
  Promise = env.require('bluebird');
  assert = env.require('cassert');
  util = env.require('util');
  commons = require('pimatic-plugin-commons')(env);
  M = env.matcher;
  Client = require('node-rest-client').Client;
  client = new Client();
  cliopts = {
    requestConfig: {
      timeout: 60000
    },
    responseConfig: {
      timeout: 60000
    }
  };
  exec = function(command, verb, options) {
    return new Promise(function(resolve, reject) {
      var req;
      if (verb === "put") {
        console.log("pase put");
        req = client.put(command, cliopts, function(data, response) {
          if (response.statusCode !== 200) {
            console.log("Error html: " + response.statusCode);
            return reject(new Error("Error Html: " + response.statusCode));
          }
          return resolve({
            stdout: data,
            stderr: response
          });
        });
      } else {
        console.log("pase get");
        req = client.get(command, cliopts, function(data, response) {
          if (response.statusCode !== 200) {
            console.log("Error html: " + response.statusCode);
            return reject(new Error("Error Html: " + response.statusCode));
          }
          return resolve({
            stdout: data,
            stderr: response
          });
        });
      }
      req.on('requestTimeout', function(req) {
        console.log('request has expired');
        req.abort();
        return reject(new Error("req Timeout"));
      });
      req.on('responseTimeout', function(res) {
        console.log('response has expired');
        return reject(new Error("res Timeout"));
      });
      return req.on('error', function(err) {
        console.log('request error', err);
        return reject(err);
      });
    });
  };
  settled = function(promise) {
    return Promise.settle([promise]);
  };
  transformError = (function(_this) {
    return function(error) {
      var cause;
      if ((error.code != null) && (error.cause != null)) {
        cause = String(error.cause).replace(/(\r\n|\n|\r)/gm, " ").trim();
        error = new Error("Command execution failed with exit code " + error.code + " (" + cause + ")");
      }
      return error;
    };
  })(this);
  BasicHttp = (function(superClass) {
    extend(BasicHttp, superClass);

    function BasicHttp() {
      this.init = bind(this.init, this);
      return BasicHttp.__super__.constructor.apply(this, arguments);
    }

    BasicHttp.prototype.init = function(app, framework, config1) {
      var deviceConfigDef, lastAction, realExec;
      this.framework = framework;
      this.config = config1;
      deviceConfigDef = require("./device-config-schema");
      this.framework.deviceManager.registerDeviceClass("BasicHttpSwitch", {
        configDef: deviceConfigDef.BasicHttpSwitch,
        createCallback: (function(_this) {
          return function(config, lastState) {
            return new BasicHttpSwitch(config, lastState);
          };
        })(this)
      });
      this.framework.deviceManager.registerDeviceClass("BasicHttpSensor", {
        configDef: deviceConfigDef.BasicHttpSensor,
        createCallback: (function(_this) {
          return function(config, lastState) {
            return new BasicHttpSensor(config, lastState);
          };
        })(this)
      });
      this.framework.deviceManager.registerDeviceClass("BasicHttpSensor2", {
        configDef: deviceConfigDef.BasicHttpSensor2,
        createCallback: (function(_this) {
          return function(config, lastState) {
            return new BasicHttpSensor2(config, lastState);
          };
        })(this)
      });
      this.framework.ruleManager.addActionProvider(new BasicHttpActionProvider(this.framework, this.config));
      if (this.config.sequential) {
        realExec = exec;
        lastAction = Promise.resolve();
        exec = function(command, verb, options) {
          lastAction = settled(lastAction).then(function() {
            return realExec(command, verb, options);
          });
          return lastAction;
        };
      }
      return this.execOptions = {
        shell: this.config.shell,
        cwd: this.config.cwd
      };
    };

    return BasicHttp;

  })(env.plugins.Plugin);
  plugin = new BasicHttp();
  BasicHttpSensor = (function(superClass) {
    extend(BasicHttpSensor, superClass);

    function BasicHttpSensor(config1, lastState) {
      var attributeName, getter, ref, updateValue;
      this.config = config1;
      this.name = this.config.name;
      this.id = this.config.id;
      this.base = commons.base(this, this.config["class"]);
      attributeName = this.config.attributeName;
      this.attributeValue = lastState != null ? (ref = lastState[attributeName]) != null ? ref.value : void 0 : void 0;
      this.attributes = {};
      this.attributes[attributeName] = {
        description: attributeName,
        type: this.config.attributeType
      };
      if (this.config.attributeUnit.length > 0) {
        this.attributes[attributeName].unit = this.config.attributeUnit;
      }
      if (this.config.attributeAcronym.length > 0) {
        this.attributes[attributeName].acronym = this.config.attributeAcronym;
      }
      if (this.config.discrete != null) {
        this.attributes[attributeName].discrete = this.config.discrete;
      }
      getter = 'get' + attributeName[0].toUpperCase() + attributeName.slice(1);
      this[getter] = (function(_this) {
        return function() {
          if (_this.attributeValue != null) {
            return Promise.resolve(_this.attributeValue);
          } else {
            return _this._getUpdatedAttributeValue();
          }
        };
      })(this);
      updateValue = (function(_this) {
        return function() {
          if (_this.config.interval > 0) {
            _this._updateValueTimeout = null;
            return _this._getUpdatedAttributeValue()["finally"](function() {
              return _this._updateValueTimeout = setTimeout(updateValue, _this.config.interval);
            });
          }
        };
      })(this);
      BasicHttpSensor.__super__.constructor.call(this);
      updateValue();
    }

    BasicHttpSensor.prototype.destroy = function() {
      if (this._updateValueTimeout != null) {
        clearTimeout(this._updateValueTimeout);
      }
      return BasicHttpSensor.__super__.destroy.call(this);
    };

    BasicHttpSensor.prototype._getUpdatedAttributeValue = function() {
      return exec(this.config.command, "GET", plugin.execOptions).then((function(_this) {
        return function(arg) {
          var stderr, stdout;
          stdout = arg.stdout, stderr = arg.stderr;
          stdout = stdout.toString();
          _this.attributeValue = stdout.trim();
          if (_this.config.attributeType === "number") {
            _this.attributeValue = parseFloat(_this.attributeValue);
          }
          _this.emit(_this.config.attributeName, _this.attributeValue);
          return _this.attributeValue;
        };
      })(this))["catch"]((function(_this) {
        return function(error) {
          return _this.base.rejectWithErrorString(Promise.reject, transformError(error));
        };
      })(this));
    };

    return BasicHttpSensor;

  })(env.devices.Sensor);
  BasicHttpSensor2 = (function(superClass) {
    extend(BasicHttpSensor2, superClass);

    function BasicHttpSensor2(config1, lastState, framework) {
      var attributeName, getter, i, makeGetter, ref, ref1, ref2, ref3, updateValue;
      this.config = config1;
      this.framework = framework;
      this.name = this.config.name;
      this.id = this.config.id;
      this.base = commons.base(this, this.config["class"]);
      this.attributes = {};
      i = 0;
      while ((((ref3 = this.config.tablaAttr[i]) != null ? ref3.attributeName : void 0) != null)) {
        console.log("valor de i " + i);
        attributeName = this.config.tablaAttr[i].attributeName;
        this[attributeName] = lastState != null ? (ref = lastState[attributeName]) != null ? ref.value : void 0 : void 0;
        if (this.config.tablaAttr[i].attributeType === "number") {
          this[attributeName] = parseFloat(this[attributeName]);
        }
        console.log("init1 atributo " + attributeName + " valor " + this[attributeName]);
        this.attributes[attributeName] = {
          description: attributeName,
          type: this.config.tablaAttr[i].attributeType
        };
        if (((ref1 = this.config.tablaAttr[i].attributeUnit) != null ? ref1.length : void 0) > 0) {
          this.attributes[attributeName].unit = this.config.tablaAttr[i].attributeUnit;
        }
        if (((ref2 = this.config.tablaAttr[i].attributeAcronym) != null ? ref2.length : void 0) > 0) {
          this.attributes[attributeName].acronym = this.config.tablaAttr[i].attributeAcronym;
        }
        if (this.config.tablaAttr[i].discrete != null) {
          this.attributes[attributeName].discrete = this.config.tablaAttr[i].discrete;
        }
        getter = 'get' + attributeName[0].toUpperCase() + attributeName.slice(1);
        makeGetter = function(attributeName, getter) {
          var attrName, fgetter, wgetter;
          attrName = attributeName;
          wgetter = getter;
          console.log("creo Metodo " + wgetter);
          fgetter = function() {
            console.log("ejecutando " + wgetter);
            if (this[attrName] != null) {
              console.log(" Paso por 1");
              console.log(" devuelvo " + this[attrName]);
              return Promise.resolve(this[attrName]);
            } else {
              console.log(" Paso por 2");
              this._getUpdatedAttributeValue();
              return this[attrName];
            }
          };
          return fgetter;
        };
        this[getter] = makeGetter(attributeName, getter);
        console.log("init2 atributo " + attributeName + " valor " + this[attributeName]);
        i = i + 1;
        console.log("fin valor de i " + i);
      }
      console.log("fuera loop");
      this.cantArtributos = i;
      this.attributes["stateConn"] = {
        description: "stateConn",
        type: "boolean"
      };
      this.stateConn = true;
      updateValue = (function(_this) {
        return function() {
          if (_this.config.interval > 0) {
            _this._updateValueTimeout = null;
            return _this._getUpdatedAttributeValue()["finally"](function() {
              return _this._updateValueTimeout = setTimeout(updateValue, _this.config.interval);
            });
          }
        };
      })(this);
      BasicHttpSensor2.__super__.constructor.call(this);
      updateValue();
    }

    BasicHttpSensor2.prototype.destroy = function() {
      if (this._updateValueTimeout != null) {
        clearTimeout(this._updateValueTimeout);
      }
      return BasicHttpSensor2.__super__.destroy.call(this);
    };

    BasicHttpSensor2.prototype._getUpdatedAttributeValue = function() {
      return exec(this.config.command, "GET", plugin.execOptions).then((function(_this) {
        return function(arg) {
          var attributeName, aux, hay_valor, i, pattern, ref, ref1, stderr, stdout;
          stdout = arg.stdout, stderr = arg.stderr;
          _this._setStateConn(true);
          stdout = stdout.toString();
          console.log("stdout : " + stdout);
          aux = stdout.split(";");
          pattern = /[0-9.-]+/;
          hay_valor = false;
          i = 0;
          while ((((ref = _this.config.tablaAttr[i]) != null ? ref.attributeName : void 0) != null)) {
            if (_this.config.tablaAttr[i].attributeType === "number") {
              if (!(aux[i].match(pattern))) {
                _this.base.error("Vino valor con formato incorrecto " + stdout);
                throw new Error("Vino valor con formato incorrecto " + stdout);
              }
              if (parseFloat(aux[i]) !== 0) {
                hay_valor = true;
              }
            }
            i = i + 1;
          }
          if (!hay_valor) {
            _this.base.error("Todos los valores en 0 " + stdout);
            throw new Error("Todos los valores en 0 " + stdout);
          }
          i = 0;
          while ((((ref1 = _this.config.tablaAttr[i]) != null ? ref1.attributeName : void 0) != null)) {
            attributeName = _this.config.tablaAttr[i].attributeName;
            _this[attributeName] = aux[i];
            if (_this.config.tablaAttr[i].attributeType === "number") {
              _this[attributeName] = parseFloat(_this[attributeName]);
            }
            console.log("emit atributo " + attributeName + " valor " + _this[attributeName]);
            _this.emit(attributeName, _this[attributeName]);
            i = i + 1;
          }
          return 0;
        };
      })(this))["catch"]((function(_this) {
        return function(error) {
          _this._setStateConn(false);
          return _this.base.rejectWithErrorString(Promise.reject, transformError(error));
        };
      })(this));
    };

    BasicHttpSensor2.prototype.getStateConn = function() {
      return Promise.resolve(this.stateConn);
    };

    BasicHttpSensor2.prototype._setStateConn = function(stateConn) {
      if (this.stateConn !== stateConn) {
        this.stateConn = stateConn;
        return this.emit("stateConn", stateConn);
      }
    };

    return BasicHttpSensor2;

  })(env.devices.Sensor);
  BasicHttpSwitch = (function(superClass) {
    extend(BasicHttpSwitch, superClass);

    function BasicHttpSwitch(config1, lastState) {
      var ref, updateValue;
      this.config = config1;
      this.name = this.config.name;
      this.id = this.config.id;
      this.base = commons.base(this, this.config["class"]);
      this.forceExecution = this.config.forceExecution;
      this._state = (lastState != null ? (ref = lastState.state) != null ? ref.value : void 0 : void 0) || false;
      this.attributes["stateConn"] = {
        description: "stateConn",
        type: "boolean"
      };
      this.stateConn = true;
      this._setState(false);
      updateValue = (function(_this) {
        return function() {
          if (_this.config.interval > 0) {
            _this._updateValueTimeout = null;
            console.log("pase 1");
            return _this.getState()["finally"](function() {
              return _this._updateValueTimeout = setTimeout(updateValue, _this.config.interval);
            });
          }
        };
      })(this);
      BasicHttpSwitch.__super__.constructor.call(this);
      if (this.config.getStateCommand != null) {
        updateValue();
      }
    }

    BasicHttpSwitch.prototype.destroy = function() {
      if (this._updateValueTimeout != null) {
        clearTimeout(this._updateValueTimeout);
      }
      return BasicHttpSwitch.__super__.destroy.call(this);
    };

    BasicHttpSwitch.prototype.getState = function() {
      if (this.config.getStateCommand == null) {
        return Promise.resolve(this._state);
      } else {
        return exec(this.config.getStateCommand, this.config.getStateVerb, plugin.execOptions).then((function(_this) {
          return function(arg) {
            var stderr, stdout;
            stdout = arg.stdout, stderr = arg.stderr;
            console.log("pase 2");
            _this._setStateConn(true);
            stdout = stdout.toString();
            switch (stdout) {
              case "on":
              case "true":
              case "1":
              case "t":
              case "o":
                _this._setState(true);
                return Promise.resolve(_this._state);
              case "off":
              case "false":
              case "0":
              case "f":
                _this._setState(false);
                return Promise.resolve(_this._state);
              default:
                if (stderr.length !== 0) {
                  _this.base.error("stderr output from getStateCommand for " + _this.name + ": " + stderr);
                }
                throw new Error("unknown state=\"" + stdout + "\"!");
            }
          };
        })(this))["catch"]((function(_this) {
          return function(error) {
            console.log("pase 3");
            _this._setStateConn(false);
            return _this.base.rejectWithErrorString(Promise.reject, transformError(error));
          };
        })(this));
      }
    };

    BasicHttpSwitch.prototype.changeStateTo = function(state) {
      var command, verb;
      console.log("pase 4");
      if (this._state === state && !this.forceExecution) {
        return Promise.resolve();
      }
      command = (state ? this.config.onCommand : this.config.offCommand);
      verb = (state ? this.config.onVerb : this.config.offVerb);
      return exec(command, verb, plugin.execOptions).then((function(_this) {
        return function(arg) {
          var stderr, stdout;
          stdout = arg.stdout, stderr = arg.stderr;
          return _this._setState(state);
        };
      })(this))["catch"]((function(_this) {
        return function(error) {
          _this._setStateConn(false);
          return _this.base.rejectWithErrorString(Promise.reject, transformError(error));
        };
      })(this));
    };

    BasicHttpSwitch.prototype.getStateConn = function() {
      return Promise.resolve(this.stateConn);
    };

    BasicHttpSwitch.prototype._setStateConn = function(stateConn) {
      if (this.stateConn !== stateConn) {
        this.stateConn = stateConn;
        return this.emit("stateConn", stateConn);
      }
    };

    return BasicHttpSwitch;

  })(env.devices.PowerSwitch);
  BasicHttpActionProvider = (function(superClass) {
    extend(BasicHttpActionProvider, superClass);

    function BasicHttpActionProvider(framework, config1) {
      this.framework = framework;
      this.config = config1;
      this.parseAction = bind(this.parseAction, this);
      return;
    }

    BasicHttpActionProvider.prototype.parseAction = function(input, context) {
      var defaultMessage, m, match, messageTokens, next, setMessage, strToTokens, tokensToStr;
      defaultMessage = this.config.mensaje;
      strToTokens = (function(_this) {
        return function(str) {
          return ["\"" + str + "\""];
        };
      })(this);
      tokensToStr = (function(_this) {
        return function(tokens) {
          return tokens[0].replace(/\'|\"/g, "");
        };
      })(this);
      messageTokens = strToTokens(defaultMessage);
      setMessage = (function(_this) {
        return function(m, tokens) {
          return messageTokens = tokens;
        };
      })(this);
      m = M(input, context).match('display ', {
        optional: true
      }).match(['displayLcd']);
      next = m.match(' mensaje:').matchStringWithVars(setMessage);
      if (next.hadMatch()) {
        m = next;
      }
      if (m.hadMatch()) {
        match = m.getFullMatch();
        assert(Array.isArray(messageTokens));
        return {
          token: match,
          nextInput: input.substring(match.length),
          actionHandler: new BasicHttpActionHandler(this.framework, messageTokens)
        };
      }
    };

    return BasicHttpActionProvider;

  })(env.actions.ActionProvider);
  BasicHttpActionHandler = (function(superClass) {
    extend(BasicHttpActionHandler, superClass);

    function BasicHttpActionHandler(framework, messageTokens1) {
      this.framework = framework;
      this.messageTokens = messageTokens1;
    }

    BasicHttpActionHandler.prototype.executeAction = function(simulate, context) {
      return Promise.all([this.framework.variableManager.evaluateStringExpression(this.messageTokens)]).then((function(_this) {
        return function(arg) {
          var message;
          message = arg[0];
          if (simulate) {
            return __("would displayLcd message \"%s\"", message);
          } else {
            return exec(message, "GET", plugin.execOptions).then(function(arg1) {
              var stderr, stdout;
              stdout = arg1.stdout, stderr = arg1.stderr;
              return __("displayLcd mensaje enviado");
            })["catch"](function(error) {
              return _this.base.rejectWithErrorString(Promise.reject, transformError(error));
            });
          }
        };
      })(this));
    };

    return BasicHttpActionHandler;

  })(env.actions.ActionHandler);
  module.exports.BasicHttpActionHandler = BasicHttpActionHandler;
  return plugin;
};
