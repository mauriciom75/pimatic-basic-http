# #BasicHttp device configuration options
module.exports = {
  title: "pimatic-basic-http device config schemas"
  BasicHttpSwitch: {
    title: "BasicHttpSwitch config options"
    type: "object"
    extensions: ["xConfirm", "xLink", "xOnLabel", "xOffLabel"]
    properties:
      onCommand:
        description: "the url to execute for switching on"
        type: "string"
      onVerb:
        description: "http verb for switching on"
        type: "string"
      offCommand:
        description: "the url to execute for switching off"
        type: "string"
      offVerb:
        description: "http verb for switching off"
        type: "string"
      getStateCommand:
        description: "
          the url to execute to get current state. 
          Can return on/off, true/false or 1/0 as string
        "
        type: "string"
        required: false
      getStateVerb:
        description: "
          the http verb to execute to get current state. 
          Can return on/off, true/false or 1/0 as string
        "
        type: "string"
        required: false
      interval:
        description: "
          the time in ms, the url gets executed to get the actual state. 
          If 0 then the state will not updated automatically.
        "
        type: "integer"
        default: 0
      forceExecution:
        description: "
          always execute url even if switch already is set to the requested state
        "
        type: "boolean"
        default: false
  }
  BasicHttpSensor: {
    title: "BasicHttpSensor config options"
    type: "object"
    extensions: ["xLink"]
    properties:
      attributeName:
        description: "the name of the attribute the sensor is monitoring"
        type: "string"
      attributeType:
        description: "the type of the attribute the sensor is monitoring"
        type: "string"
        enum: ["string", "number"]
        default: "string"
      attributeUnit:
        description: "this unit of the attribute the sensor is monitoring"
        type: "string"
        default: ""
      attributeAcronym:
        description: "this acronym of the attribute the sensor is monitoring"
        type: "string"
        default: ""
      discrete:
        description: "
          Should be set to true if the value does not change continuously over time.
        "
        type: "boolean"
        required: false
      command:
        description: "the command to execute and read the attribute value from stdout"
        type: "string"
        default: "echo value"
      interval:
        description: "the time in ms, the command gets executed to get a new sensor value"
        type: "integer"
        default: 300000
  }
  BasicHttpSensor2: {
   title: "BasicHttpSensor2 config options"
   type: "object"
   extensions: ["xLink"]
   properties:
     tablaAttr:
       type: "array"
       default: []
       format: "table"
       items:
        type: "object"
        properties:
          attributeName:
            description: "the name of the attribute the sensor is monitoring"
            type: "string"
          attributeType:
            description: "the type of the attribute the sensor is monitoring"
            type: "string"
            enum: ["string", "number"]
            default: "string"
          attributeUnit:
            description: "this unit of the attribute the sensor is monitoring"
            type: "string"
            default: ""
          attributeAcronym:
            description: "this acronym of the attribute the sensor is monitoring"
            type: "string"
            default: ""
          discrete:
            description: "
              Should be set to true if the value does not change continuously over time.
            "
            type: "boolean"
            required: false
     command:
        description: "the command to execute and read the attribute value from stdout"
        type: "string"
        default: "echo value"
     interval:
        description: "the time in ms, the command gets executed to get a new sensor value"
        type: "integer"
        default: 300000
  }


}
