
MACRO_UID_PREFIX          = "uid:"

// devices
MACRO_SLIMGW              = "SLIMGW"
MACRO_MEAGW               = "MEAGW"

// connectivity
MACRO_WIFI                = "WIFI"
MACRO_LTE                 = "LTE"

// TOPICS
MACRO_TOPIC_FW_SETTINGS   = "fw/settings"
MACRO_TOPIC_APP_SETTINGS  = "app/settings"
MACRO_TOPIC_FOTA_SET      = "fw/fota/update/set"
MACRO_TOPIC_AR            = "/ar"
MACRO_TOPIC_AR_SET        = "/ar/set"
MACRO_TOPIC_ALARM         = "/alarm"
MACRO_TOPIC_ALARM_SET     = "/alarm/set"
MACRO_TOPIC_JS_CODE_SET   = "/js/code/set"
MACRO_TOPIC_JS_CODE       = "/js/code"
MACRO_TOPIC_SETPOINTS_SET = "app/setpoints/set"

// FW KEYS
MACRO_KEY_FW_SETTINGS     = "fw_settings"
MACRO_KEY_FW_VERSION      = "fw_version"
MACRO_KEY_APP_VERSION     = "app_version"
MACRO_KEY_STATUS          = "status"
MACRO_KEY_MODEL           = "model"
MACRO_KEY_AR              = "autorequests"
MACRO_KEY_ALARM           = "alarms"
MACRO_KEY_JS_CODE         = "js_program"
MACRO_KEY_SETPOINTS       = "setpoints"

// APP KEYS
MACRO_KEY_APP_SETTINGS    = "app_settings"


module.exports = {
  topics : { // topics to read
    fw : {
      settings : ["mqtt","keepalive","log"],
      wifi : ["wifi"],
      lte : ["modem"],
      files : ["ar","alarm","js/code"]
    },
    app : {
      slimgw : ["pc","andon","rs485"],
      meagw : ["ea","rs485"]
    }
  }
}
