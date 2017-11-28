module.exports = (env) ->
  Promise = env.require 'bluebird'
  assert = env.require 'cassert'
  util = env.require 'util'

  commons = require('pimatic-plugin-commons')(env)
  M = env.matcher
  #child_process = require("child_process")


  Client = require('node-rest-client').Client;
  client = new Client();

  cliopts = {
      requestConfig: {
          timeout: 60000 
      },
      responseConfig: {
          timeout: 60000  
      }
  }

  exec = (command, verb, options) ->
    return new Promise( (resolve, reject) ->
      
      #"http://remote.site/rest/xml/${id}/method?arg1=hello&arg2=world" ojo manejo de variables
      # options
      if verb == "put"
        console.log("pase put")
        req = client.put(command, cliopts, (data,response) ->
          if response.statusCode != 200
            console.log("Error html: " + response.statusCode)
            return reject(new Error("Error Html: " + response.statusCode ))
          return resolve({stdout: data, stderr: response})
        )
      else # asumo GET
        console.log("pase get")
        req = client.get(command, cliopts, (data,response) ->
          if response.statusCode != 200
            console.log("Error html: " + response.statusCode)
            return reject(new Error("Error Html: " + response.statusCode ))
          return resolve({stdout: data, stderr: response})
        )
      
      req.on('requestTimeout', (req) ->
        console.log('request has expired')
        req.abort()
        return reject(new Error("req Timeout"))
      )
      req.on('responseTimeout', (res) ->
        console.log('response has expired')
        return reject(new Error("res Timeout"))
      )
      req.on('error', (err) ->
        console.log('request error', err)
        return reject(err)
      )

    )
  settled = (promise) -> Promise.settle([promise])

  transformError = (error) =>
    if error.code? and error.cause?
      cause = String(error.cause).replace(/(\r\n|\n|\r)/gm," ").trim()
      error = new Error "Command execution failed with exit code #{error.code} (#{cause})"
    return error

  class BasicHttp extends env.plugins.Plugin

    init: (app, @framework, @config) =>


      deviceConfigDef = require("./device-config-schema")

      @framework.deviceManager.registerDeviceClass("BasicHttpSwitch", {
        configDef: deviceConfigDef.BasicHttpSwitch, 
        createCallback: (config, lastState) => return new BasicHttpSwitch(config, lastState)
      })
      @framework.deviceManager.registerDeviceClass("BasicHttpSensor", {
        configDef: deviceConfigDef.BasicHttpSensor, 
        createCallback: (config, lastState) => return new BasicHttpSensor(config, lastState)
      })
      @framework.deviceManager.registerDeviceClass("BasicHttpSensor2", {
        configDef: deviceConfigDef.BasicHttpSensor2, 
        createCallback: (config, lastState) => return new BasicHttpSensor2(config, lastState)
      })
# config estaba sin arroba
      @framework.ruleManager.addActionProvider(new BasicHttpActionProvider @framework, @config)



      if @config.sequential
        realExec = exec
        lastAction = Promise.resolve()
        exec = (command, verb, options) ->
          lastAction = settled(lastAction).then( -> realExec(command, verb, options) )
          return lastAction

      @execOptions =
        shell: @config.shell
        cwd: @config.cwd


  plugin = new BasicHttp()











  class BasicHttpSensor extends env.devices.Sensor

    constructor: (@config, lastState) ->
      @name = @config.name
      @id = @config.id
      @base = commons.base @, @config.class

      attributeName = @config.attributeName
      @attributeValue = lastState?[attributeName]?.value

      @attributes = {}
      @attributes[attributeName] =
        description: attributeName
        type: @config.attributeType

      if @config.attributeUnit.length > 0
        @attributes[attributeName].unit = @config.attributeUnit

      if @config.attributeAcronym.length > 0
        @attributes[attributeName].acronym = @config.attributeAcronym

      if @config.discrete?
        @attributes[attributeName].discrete = @config.discrete

      # Create a getter for this attribute
      getter = 'get' + attributeName[0].toUpperCase() + attributeName.slice(1)
      @[getter] = () => 
        if @attributeValue? then Promise.resolve(@attributeValue)
        else @_getUpdatedAttributeValue()

      updateValue = =>
        if @config.interval > 0
          @_updateValueTimeout = null
          @_getUpdatedAttributeValue().finally( =>
            @_updateValueTimeout = setTimeout(updateValue, @config.interval)
          )

      super()
      updateValue()

    destroy: () ->
      clearTimeout @_updateValueTimeout if @_updateValueTimeout?
      super()

    _getUpdatedAttributeValue: () ->
      return exec(@config.command, "GET", plugin.execOptions).then( ({stdout, stderr}) =>
        #if stderr.length isnt 0
        #  throw new Error("Error getting attribute value for #{@name}: #{stderr}")
        stdout = stdout.toString()
        @attributeValue = stdout.trim()
        if @config.attributeType is "number" then @attributeValue = parseFloat(@attributeValue)
        @emit @config.attributeName, @attributeValue

        return @attributeValue
      ).catch( (error) =>
        @base.rejectWithErrorString Promise.reject, transformError(error)
      )







  class BasicHttpSensor2 extends env.devices.Sensor

    constructor: (@config, lastState, @framework) ->
      @name = @config.name
      @id = @config.id
      @base = commons.base @, @config.class




      @attributes = {}
#      @attributeValue = {}

      i = 0
      while (@config.tablaAttr[i]?.attributeName?)

        console.log("valor de i " + i)

        attributeName = @config.tablaAttr[i].attributeName
        @[attributeName] = lastState?[attributeName]?.value

        if @config.tablaAttr[i].attributeType is "number" then @[attributeName] = parseFloat(@[attributeName])

        console.log("init1 atributo " + attributeName + " valor " + @[attributeName])

        @attributes[attributeName] =
          description: attributeName
          type: @config.tablaAttr[i].attributeType

        if @config.tablaAttr[i].attributeUnit?.length > 0
          @attributes[attributeName].unit = @config.tablaAttr[i].attributeUnit

        if @config.tablaAttr[i].attributeAcronym?.length > 0
          @attributes[attributeName].acronym = @config.tablaAttr[i].attributeAcronym

        if @config.tablaAttr[i].discrete?
          @attributes[attributeName].discrete = @config.tablaAttr[i].discrete


        getter = 'get' + attributeName[0].toUpperCase() + attributeName.slice(1)

        makeGetter = (attributeName, getter) ->

          # Create a getter for this attribute
          attrName = attributeName
          wgetter = getter

          console.log("creo Metodo " + wgetter)
          #@[getter] = () -> 
          fgetter = () ->
            console.log ("ejecutando " + wgetter)

            if @[attrName]?
              console.log (" Paso por 1")
              console.log (" devuelvo " + @[attrName])
              Promise.resolve(@[attrName]) 
            else
              console.log (" Paso por 2")
              @_getUpdatedAttributeValue()
              return @[attrName]

          return fgetter

        @[getter] = makeGetter(attributeName,getter)

        console.log("init2 atributo " + attributeName + " valor " + @[attributeName])

        i = i + 1
        console.log("fin valor de i " + i)
      console.log("fuera loop")

      @cantArtributos = i

      @attributes["stateConn"] =
        description: "stateConn"
        type: "boolean"
       
      @stateConn = true


      updateValue = =>
        if @config.interval > 0
          @_updateValueTimeout = null
          @_getUpdatedAttributeValue().finally( =>
            @_updateValueTimeout = setTimeout(updateValue, @config.interval)
          )

      super()
      updateValue()

    destroy: () ->
      clearTimeout @_updateValueTimeout if @_updateValueTimeout?
      super()


    _getUpdatedAttributeValue: () ->
      return exec(@config.command, "GET", plugin.execOptions).then( ({stdout, stderr}) =>
        #if stderr.length isnt 0
        #  throw new Error("Error getting attribute value for #{@name}: #{stderr}")
        @_setStateConn(true)
        stdout = stdout.toString()
        console.log("stdout : " + stdout)
        aux = stdout.split(";")

        pattern = ///
          [0-9.-]+
          ///

        hay_valor = false
        i = 0
        while (@config.tablaAttr[i]?.attributeName?)
          if @config.tablaAttr[i].attributeType is "number"
            if !(aux[i].match pattern)
              @base.error "Vino valor con formato incorrecto #{stdout}"
              throw new Error "Vino valor con formato incorrecto #{stdout}"
            if (parseFloat(aux[i]) != 0)
              hay_valor = true
          i = i + 1
        if !hay_valor
          @base.error "Todos los valores en 0 #{stdout}"
          throw new Error "Todos los valores en 0 #{stdout}"

        i = 0
        while (@config.tablaAttr[i]?.attributeName?)
          attributeName = @config.tablaAttr[i].attributeName
          @[attributeName] = aux[i]

          if @config.tablaAttr[i].attributeType is "number" then @[attributeName] = parseFloat(@[attributeName])
          console.log("emit atributo " + attributeName + " valor " + @[attributeName])
          @emit attributeName, @[attributeName]
          i = i + 1
        return 0
      ).catch( (error) =>
        @_setStateConn(false)
        @base.rejectWithErrorString Promise.reject, transformError(error)
      )

    getStateConn: () -> 
      Promise.resolve(@stateConn)

    _setStateConn: (stateConn) -> 
      if @stateConn != stateConn 
        @stateConn = stateConn
        return @emit "stateConn", stateConn




  class BasicHttpSwitch extends env.devices.PowerSwitch

#    attributes:
#      stateConn:
#        description: "State of connection."
#        type: "boolean"

        
    constructor: (@config, lastState) ->
      @name = @config.name
      @id = @config.id
      @base = commons.base @, @config.class
      @forceExecution = @config.forceExecution

      @_state = lastState?.state?.value or off

      # agrego este atributo en forma dinamica, por las dudas para no pisar al resto.
      @attributes["stateConn"] =
        description: "stateConn"
        type: "boolean"
        

      @stateConn = true
      @_setState(off)

      updateValue = =>
        if @config.interval > 0
          @_updateValueTimeout = null
          console.log("pase 1")
          @getState().finally( =>
            @_updateValueTimeout = setTimeout(updateValue, @config.interval)
          )

      super()
      if @config.getStateCommand?
        updateValue()

    destroy: () ->
      clearTimeout @_updateValueTimeout if @_updateValueTimeout?
      super()

    getState: () ->
      if not @config.getStateCommand?
        return Promise.resolve @_state
      else
        return exec(@config.getStateCommand, @config.getStateVerb, plugin.execOptions).then( ({stdout, stderr}) =>
          console.log("pase 2")
          #stdout = stdout.trim()

          @_setStateConn(true)

          stdout = stdout.toString()

          switch stdout
            when "on", "true", "1", "t", "o"
              @_setState(on)
              return Promise.resolve @_state
            when "off", "false", "0", "f"
              @_setState(off)
              return Promise.resolve @_state
            else
              @base.error "stderr output from getStateCommand for #{@name}: #{stderr}" if stderr.length isnt 0
              throw new Error "unknown state=\"#{stdout}\"!"
        ).catch( (error) =>
          console.log("pase 3")
          @_setStateConn(false)

          @base.rejectWithErrorString Promise.reject, transformError(error)
        )
        
    changeStateTo: (state) ->
      console.log("pase 4")
      if @_state is state and not @forceExecution then return Promise.resolve()
      # and execute it.
      command = (if state then @config.onCommand else @config.offCommand)
      verb = (if state then @config.onVerb else @config.offVerb)
      return exec(command, verb, plugin.execOptions).then( ({stdout, stderr}) =>
        #@base.error "stderr output from on/offCommand for #{@name}: #{stderr}" if stderr.length isnt 0
        #@_setStateConn(true)

        @_setState(state)
      ).catch( (error) =>
        @_setStateConn(false)

        @base.rejectWithErrorString Promise.reject, transformError(error)
      )
  
    getStateConn: () -> 
      Promise.resolve(@stateConn)

    _setStateConn: (stateConn) -> 
      if @stateConn != stateConn 
        @stateConn = stateConn
        return @emit "stateConn", stateConn












  class BasicHttpActionProvider extends env.actions.ActionProvider
  
    constructor: (@framework, @config) ->
      return

    parseAction: (input, context) =>

      defaultMessage = @config.mensaje
        
      # Helper to convert 'some text' to [ '"some text"' ]
      strToTokens = (str) => ["\"#{str}\""]
      # Helper to convert [ '"some text"' ] to 'some text'
      tokensToStr = (tokens) => tokens[0].replace(/\'|\"/g, "")

      messageTokens = strToTokens defaultMessage

      setMessage = (m, tokens) => messageTokens = tokens

      m = M(input, context)
        .match('display ', optional: yes)
        .match(['displayLcd'])

      next = m.match(' mensaje:').matchStringWithVars(setMessage)
      if next.hadMatch() then m = next

      if m.hadMatch()
        match = m.getFullMatch()

        assert Array.isArray(messageTokens)

        return {
          token: match
          nextInput: input.substring(match.length)
          actionHandler: new BasicHttpActionHandler(
            @framework, messageTokens
          )
        }
            

  class BasicHttpActionHandler extends env.actions.ActionHandler 

    constructor: (@framework, @messageTokens ) ->

    executeAction: (simulate, context) ->
      Promise.all( [
        @framework.variableManager.evaluateStringExpression(@messageTokens)
      ]).then( ([message]) =>
            if simulate
              return __("would displayLcd message \"%s\"", message)
            else
# aca tengo que hacer algo
              return exec(message, "GET", plugin.execOptions).then( ({stdout, stderr}) =>
                #if stderr.length isnt 0
                #  throw new Error("Error getting attribute value for #{@name}: #{stderr}")
                __("displayLcd mensaje enviado") 

              ).catch( (error) =>
                @base.rejectWithErrorString Promise.reject, transformError(error)
              )

#              )

      )

  module.exports.BasicHttpActionHandler = BasicHttpActionHandler

  # and return it to the framework.





  return plugin
