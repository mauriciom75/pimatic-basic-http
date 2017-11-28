module.exports = {
  title: "basic http config options"
  type: "object"
  properties:
    sequential:
      description: "
        Run commands sequential (not in parallel). Enable this if you have commands 
        that should not be execute in parallel
      "
      type: "boolean"
      default: false
    shell:
      description: "(sin uso) Shell to execute a command with. Default: '/bin/sh' on UNIX, 'cmd.exe' on Windows"
      type: "string"
      required: false
    cwd:
      description: "(sin uso) Current working directory of the child process"
      type: "string"
      required: false
    mensaje:
      description: "mensaje default para display"
      type: "string"
      required: false
      default: "mensaje"
      
      
}