import appeals from './appeals'
import callLogs from './call-logs'
import eburol from './eburol'
import filesUploaded from './files-uploaded'
import history from './history'
import notifications from './notifications'
import schedule from './schedule'
import schedules from './schedules'
import sessions from './sessions'
import suggestions from './suggestions'
import taggedInmates from './tagged-inmates'
const visitor = {
    schedules: Object.assign(schedules, schedules),
schedule: Object.assign(schedule, schedule),
callLogs: Object.assign(callLogs, callLogs),
eburol: Object.assign(eburol, eburol),
notifications: Object.assign(notifications, notifications),
sessions: Object.assign(sessions, sessions),
appeals: Object.assign(appeals, appeals),
suggestions: Object.assign(suggestions, suggestions),
history: Object.assign(history, history),
filesUploaded: Object.assign(filesUploaded, filesUploaded),
taggedInmates: Object.assign(taggedInmates, taggedInmates),
}

export default visitor