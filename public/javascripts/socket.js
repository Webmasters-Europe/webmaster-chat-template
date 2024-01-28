const SOCKET = io()

SOCKET.on('connect_error', err => {
    console.log(`connect_error due to ${err.message}`)
})

SOCKET.emit('register-socketId', USER_ID)

function requestJoinRoom(roomId) {
    SOCKET.emit('join-room', roomId)
}

function requestLeaveRoom(roomId) {
    SOCKET.emit('leave-room', roomId)
}
