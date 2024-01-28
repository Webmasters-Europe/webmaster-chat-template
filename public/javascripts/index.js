window.addEventListener('DOMContentLoaded', App)

async function ConversationManager() {
	const store = createStore({ conversations: [], activeConversation: null }, reducer)
	const conversationTemplate = document.getElementById('conversation-template')
	const activeConversationCounter = document.getElementById('active-conversation-counter')
	await init()

	function createStore(initialState, reducer) {
		const state = new Proxy(
			{ value: initialState },
			{
				set(obj, prop, value) {
					obj[prop] = value
					updateConversations()
				},
			},
		)

		function getState() {
			return { ...state.value }
		}

		function dispatch(action, data) {
			const prevState = getState()
			state.value = reducer(prevState, action, data)
		}

		return {
			getState,
			dispatch,
		}
	}

	function reducer(state, action, data) {
		switch (action) {
			case 'SET':
				state = {
					...state,
					conversations: data,
				}
				break
			case 'SET_ACTIVE_CONVERSATION':
				state = {
					...state,
					activeConversation: data,
				}
				break
			case 'ADD_CONVERSATION':
				state = {
					...state,
					conversations: [...state.conversations, data],
				}
				break
			case 'DELETE_CONVERSATION':
				state = {
					...state,
					conversations: state.conversations.filter(
						({ conversation }) => conversation.conversationId !== data,
					),
				}
				break
			case 'SET_MESSAGE_INDICATOR':
				state = {
					...state,
					conversations: state.conversations.map(conversation => {
						if (conversation.conversation.conversationId === data) {
							conversation.messageIndicator = true
						}
						return conversation
					}),
				}
				break
		}
		return state
	}

	function updateConversations() {
		const conversations = store.getState().conversations
		removeConversations()
		conversations.forEach(conversation => createConversationCard(conversation))
		setConversationCount(conversations.length)
	}
	// -------------------------------- EVENT HANDLER --------------------------------
	function handleSelectConversation(e, clickedConversation) {
		e.preventDefault()
		clickedConversation.messageIndicator = false
		store.dispatch('SET_ACTIVE_CONVERSATION', clickedConversation)
	}
	// -------------------------------- FUNCTIONS --------------------------------
	async function init() {
		deactivateTemplate()
		updateConversations()
	}

	function removeConversations() {
		Array.from(document.querySelectorAll('#conversation-card')).forEach(card => card.remove())
	}

	function deactivateTemplate() {
		conversationTemplate.style.display = 'none'
	}

	function createConversationCard(conversation) {
		const newConversationCard = conversationTemplate.cloneNode(true)
		const conversationName = nameForConversation(conversation)
		newConversationCard.querySelector('a').href = `/conversation/${conversation.conversationId}`
		newConversationCard.querySelector('#conversation-card-letter').innerText = conversationName[0]
		newConversationCard.querySelector('#conversation-card-name').innerText = conversationName
		newConversationCard.style.display = 'flex'
		newConversationCard.id = 'conversation-card'
		newConversationCard.querySelector('#new-message-indicator').style.display =
			conversation.messageIndicator ? 'flex' : 'none'
		newConversationCard.addEventListener('click', e => handleSelectConversation(e, conversation))
		conversationTemplate.parentNode.appendChild(newConversationCard)
		requestJoinRoom(conversation.conversation.conversationId)
		return newConversationCard
	}

	function setConversationCount(counter) {
		activeConversationCounter.innerText = counter
	}

	return store
}

async function ChatManager() {
	const store = createStore(
		{ messages: [], name: 'Select a conversation', participantsList: '', conversationLink: '' },
		reducer,
	)
	const messageMeTemplate = document.getElementById('message-me-template')
	const messageOtherTemplate = document.getElementById('message-other-template')
	const infoTemplate = document.getElementById('information-template')
	const chatName = document.getElementById('conversation-name')
	const chatParticipantsList = document.getElementById('conversation-participants')
	const sendMessageA = document.getElementById('send-message')
	const messageInput = document.getElementById('message-input')
	const leaveConversationButton = document.getElementById('leave-conversation')
	init()

	function createStore(initialState, reducer) {
		const state = new Proxy(
			{ value: initialState },
			{
				set(obj, prop, value) {
					obj[prop] = value
					updateUi()
				},
			},
		)

		function getState() {
			return { ...state.value }
		}

		function dispatch(action, data) {
			const prevState = getState()
			state.value = reducer(prevState, action, data)
		}

		return {
			getState,
			dispatch,
		}
	}

	function reducer(state, action, data) {
		switch (action) {
			case 'SET':
				state = data
				break
			case 'ADD_MESSAGE':
				state = {
					...state,
					messages: [...state.messages, data],
				}
				break
			case 'RESET':
				state = {
					messages: [],
					name: 'Select a conversation',
					participantsList: '',
					conversationLink: '',
				}
				break
		}
		return state
	}

	function updateUi() {
		updateName()
		updateMessages()
		updateSendUiEnabled()
		updateLeaveConversationButton()
		updateChatParticipantsList()
	}

	function updateName() {
		chatName.innerText = store.getState().name
	}

	function updateMessages() {
		const { messages, conversationLink } = store.getState()
		removeChatMessages()
		messages.forEach(message => createMessage(message))
		if (messages.length || !conversationLink) return
		createMessage({ text: 'There are no messages, yet' })
	}

	function updateSendUiEnabled() {
		const conversationLink = store.getState().conversationLink
		toggleSendMessage(conversationLink)
	}

	function updateLeaveConversationButton() {
		const { conversationLink, participantsList } = store.getState()
		leaveConversationButton.removeEventListener('click', leaveConversation)
		leaveConversationButton.style.display = 'none'
		if (!conversationLink || conversationLink.includes(ALL_CHAT_ID) || !participantsList) return
		leaveConversationButton.addEventListener('click', leaveConversation)
		leaveConversationButton.style.display = 'block'
	}

	function updateChatParticipantsList() {
		chatParticipantsList.innerText = store.getState().participantsList
	}
	// -------------------------------- EVENT HANDLER --------------------------------
    function toggleSendMessage(conversationLink = '') {
        sendMessageA.href = conversationLink
        messageInput.disabled = !conversationLink
        if (conversationLink) {
            sendMessageA.classList.remove('cursor-not-allowed')
            sendMessageA.addEventListener('click', sendMessage)
            messageInput.classList.remove('cursor-not-allowed')
            messageInput.addEventListener('keydown', checkPressEnter)
            return
        }
        sendMessageA.classList.add('cursor-not-allowed')
        sendMessageA.removeEventListener('click', sendMessage)
        messageInput.classList.add('cursor-not-allowed')
        messageInput.removeEventListener('keydown', checkPressEnter)
    }

	async function sendMessage() {
		const endpoint = store.getState().conversationLink
		const newMessage = messageInput.value.trim()
		messageInput.value = ''

		if (endpoint === SERVER_IP || newMessage === '') return

		await fetchServer(
			endpoint,
			'POST',
			JSON.stringify({
				newMessage,
			}),
		)
	}

    async function checkPressEnter(e) {
        if (e.code !== 'Enter') return
        await sendMessage()
    }

	async function leaveConversation(e) {
		await fetchServer(store.getState().conversationLink, 'DELETE')
	}

	sendMessageA.addEventListener('click', e => e.preventDefault())
	leaveConversationButton.addEventListener('click', e => e.preventDefault())

	// -------------------------------- FUNCTIONS --------------------------------
	function init() {
		deactivateTemplate()
		updateUi()
	}

	function deactivateTemplate() {
		messageMeTemplate.style.display = 'none'
		messageOtherTemplate.style.display = 'none'
		infoTemplate.style.display = 'none'
	}

	function removeChatMessages() {
		Array.from(document.querySelectorAll('#message')).forEach(message => message.remove())
	}

	function createMessage(message) {
		if (message.senderId === undefined) {
			createInfoMessage(message.text)
			return
		}
		if (message.senderId === USER_ID) {
			createMeMessage(message)
			return
		}
		createOtherMessage(message)
	}

	function createInfoMessage(text) {
		const newInformation = infoTemplate.cloneNode(true)

		newInformation.querySelector('#information-text').innerText = text
		newInformation.id = 'message'
		newInformation.style.display = 'block'

		infoTemplate.parentNode.appendChild(newInformation)
	}

	function createMeMessage(message) {
		// removeEmptyConversationNotification() // wip
		const newMessage = messageMeTemplate.cloneNode(true)

		newMessage.querySelector('#message-text').innerText = message.text
		newMessage.querySelector('#message-time').innerText = formatTimestemp(message.createdAt)
		newMessage.id = 'message'

		newMessage.style.display = 'block'
		messageMeTemplate.parentNode.appendChild(newMessage)
		newMessage.scrollIntoView()
	}

	function createOtherMessage(message) {
		// removeEmptyConversationNotification() // wip
		const newMessage = messageOtherTemplate.cloneNode(true)

		newMessage.querySelector('#message-text').innerText = message.text
		newMessage.querySelector('#message-time').innerText = formatTimestemp(message.createdAt)
		newMessage.querySelector('#message-sender').innerText = message.senderName
		newMessage.id = 'message'

		newMessage.style.display = 'block'
		messageOtherTemplate.parentNode.appendChild(newMessage)
		newMessage.scrollIntoView()
	}

	function formatTimestemp(timestemp) {
		const now = new Date()
		const messageCreatedAt = new Date(timestemp)
		const timeElapsed = new Date(now.getTime() - messageCreatedAt.getTime())

		if (timeElapsed.getHours() <= 24) {
			const minutes = messageCreatedAt.getMinutes()
			const fixedMinutes = minutes === 1 ? '01' : minutes
			const hours = messageCreatedAt.getHours()
			return hours > 12 ? `${hours - 12}:${fixedMinutes} pm` : `${hours}:${fixedMinutes} am`
		}

		return messageCreatedAt.toLocaleDateString()
	}

	return store
}

async function CreateConversationManager() {
	const store = createStore(
		{ createGroup: false, groupName: '', participants: [], searchedUsers: [] },
		reducer,
	)
	const searchCardTemplate = document.getElementById('search-card-template')
	const searchGroupCardTemplate = document.getElementById('search-group-card-template')
	const enableCreateGroupButton = document.getElementById('enable-create-group')
	const createGroupUi = document.getElementById('create-group-ui')
	const createConversationUi = document.getElementById('start-chat-box')
	const groupNameInput = document.getElementById('group-name-input')
	const searchUserInputGroup = document.getElementById('search-user-input-group')
	const createGroupButton = document.getElementById('create-group')
	const searchUserInput = document.getElementById('search-user-input')
	init()

	function createStore(initialState, reducer) {
		const state = new Proxy(
			{ value: initialState },
			{
				set(obj, prop, value) {
					obj[prop] = value
					updateCreateGroupUi()
				},
			},
		)

		function getState() {
			return { ...state.value }
		}

		function dispatch(action, data) {
			const prevState = getState()
			state.value = reducer(prevState, action, data)
		}

		return {
			getState,
			dispatch,
		}
	}

	function reducer(state, action, data) {
		switch (action) {
			case 'CREATE_GROUP':
				state = {
					...state,
					createGroup: data,
				}
				break
			case 'SEARCH':
				state = {
					...state,
					searchedUsers: data,
				}
				break
			case 'SELECT':
				state = {
					...state,
					participants: [...state.participants, data],
					searchedUsers: state.searchedUsers.filter(({ username }) => username !== data.username),
				}
				break
			case 'UNSELECT':
				state = {
					...state,
					participants: state.participants.filter(({ username }) => username !== data.username),
				}
				break
			case 'RESET_UI':
				state = { ...state, groupName: '', participants: [], searchedUsers: [] }
				break
			case 'RESET':
				state = { createGroup: false, groupName: '', participants: [], searchedUsers: [] }
				break
		}
		return state
	}

	function updateCreateGroupUi() {
		const state = store.getState()
		toggleCreateGroupUi(state.createGroup)
		if (state.createGroup) {
			state.searchedUsers.forEach(searchedUser => createSearchUserGroupCard(searchedUser))
			return
		}
		removeSearchCards()

		state.searchedUsers.forEach(searchedUser => createSearchUserCard(searchedUser))
	}
	// -------------------------------- EVENT HANDLER --------------------------------
	function handleToggleCreateGroup(e) {
		e.preventDefault()
		store.dispatch('RESET_UI')
		removeSearchGroupCards(true)
		removeSearchCards()
		store.dispatch('CREATE_GROUP', !store.getState().createGroup)
	}

	async function handleSearchUser(e) {
		e.preventDefault()
		const searchedUser = searchUserInput.value.trim() || searchUserInputGroup.value.trim()
		removeSearchGroupCards()
		removeSearchCards()
		if (!searchedUser) return

		const matchingUsers = await fetchServer(`/user/${searchedUser}`)
		if (!matchingUsers || matchingUsers.error) return

		store.dispatch('SEARCH', matchingUsers)
	}
	enableCreateGroupButton.addEventListener('click', handleToggleCreateGroup)
	searchUserInputGroup.addEventListener('input', handleSearchUser)
	searchUserInput.addEventListener('input', handleSearchUser)

	// -------------------------------- FUNCTIONS --------------------------------
	function init() {
		toggleCreateGroupUi(false)
		deactivateTemplate()
	}

	function toggleCreateGroupUi(enabled) {
		const { participants } = store.getState()
		createConversationUi.style.display = enabled ? 'none' : 'block'
		enabled && (searchUserInput.value = '')
		createGroupUi.style.display = enabled ? 'block' : 'none'
		enableCreateGroupButton.innerText = enabled ? 'Cancel group' : 'Create group'
		createGroupButton.removeEventListener('click', createConversation)
		if (groupNameInput.value.trim() && participants.length > 0) {
			createGroupButton.addEventListener('click', createConversation)
		}
		if (enabled) return
		groupNameInput.value = ''
		searchUserInputGroup.value = ''
	}

	function deactivateTemplate() {
		searchCardTemplate.style.display = 'none'
		searchGroupCardTemplate.style.display = 'none'
	}

	function createSearchUserGroupCard(user) {
		const newSearchGroupCard = searchGroupCardTemplate.cloneNode(true)
		newSearchGroupCard.id = 'search-group-card'
		newSearchGroupCard.querySelector('label').innerText = user.username
		newSearchGroupCard.style.display = 'flex'
		newSearchGroupCard.addEventListener('click', e => toggleSelectUser(e, user, newSearchGroupCard))
		searchGroupCardTemplate.parentNode.appendChild(newSearchGroupCard)
	}

	function createSearchUserCard(user) {
		const newSearchCard = searchCardTemplate.cloneNode(true)
		newSearchCard.id = 'search-card'
		newSearchCard.querySelector('#search-card-text').innerText = user.username
		newSearchCard.style.display = 'flex'
		newSearchCard.addEventListener('click', e => createPrivateConversation(e, user, newSearchCard))
		searchCardTemplate.parentNode.appendChild(newSearchCard)
	}

	function toggleSelectUser(e, user, userCard) {
		e.preventDefault()
		userCardCheckbox = userCard.querySelector('input')
		const participants = store.getState().participants
		if (participants.some(({ userId }) => userId === user.userId)) {
			userCardCheckbox.checked = false
			store.dispatch('UNSELECT', user)
			userCard.id = 'search-group-card'
			handleSearchUser(new Event(''))
			return
		}
		userCardCheckbox.checked = true
		store.dispatch('SELECT', user)
		userCard.id = 'selected-card'
	}

	async function createPrivateConversation(e, user) {
		e.preventDefault()
		searchUserInput.value = ''
		store.dispatch('SELECT', user)
		await createConversation(new Event(''))
	}

	function removeSearchGroupCards(alsoSelected = false) {
		Array.from(document.querySelectorAll('#search-group-card')).forEach(card => card.remove())
		if (!alsoSelected) return
		Array.from(document.querySelectorAll('#selected-card')).forEach(card => card.remove())
	}

	function removeSearchCards() {
		Array.from(document.querySelectorAll('#search-card')).forEach(card => card.remove())
	}

	async function createConversation(e) {
		e.preventDefault()
		const participants = store.getState().participants
		await fetchServer(
			'/conversation',
			'POST',
			JSON.stringify({
				participantsIds: participants.map(({ userId }) => userId),
				groupName: groupNameInput.value.trim() || undefined,
			}),
		)
		store.dispatch('RESET')
	}

	return store
}

async function App() {
	const logoutButton = document.getElementById('logout-button')
	const chatManager = await ChatManager()
	const conversationManager = await ConversationManager()
	const createConversationManager = await CreateConversationManager()

	// -------------------------------- EVENT HANDLER --------------------------------
	async function openConversation(e, conversation) {
		e.preventDefault()
		const openedConversation = await fetchServer(
			`/conversation/${conversation.conversation.conversationId}`,
		)
		if (openedConversation.error) return console.error(openedConversation)
		conversationManager.dispatch('SET_ACTIVE_CONVERSATION', {
			conversation: openedConversation,
			div: e.currentTarget,
		})
		chatManager.dispatch('SET', {
			messages: openedConversation.conversationMessages,
			name: nameForConversation(openedConversation),
			participantsList: openedConversation.conversation.conversationName
				? createListFromParticipants(openedConversation.conversationParticipants)
				: '',
			conversationLink: `/conversation/${openedConversation.conversation.conversationId}`,
		})

		setConversationEventListeners()
	}

	logoutButton.addEventListener('click', logout)

	// -------------------------------- FUNCTIONS --------------------------------
	async function init() {
		await createConversations()
		setEventListeners()
	}

	async function createConversations() {
		const conversations = await fetchServer(`/conversation`)
		if (conversations.error) return
		conversationManager.dispatch('SET', conversations)

		setConversationEventListeners()
	}

	function setEventListeners() {
		setSocketEventListeners()
	}

	function setSocketEventListeners() {
		SOCKET.on('conversation:create', ({ conversation }) => handleCreateConversation(conversation))

		SOCKET.on('conversation:delete', ({ conversationId, leftUserId, message }) =>
			handleDeleteConversation(conversationId, leftUserId, message),
		)

		SOCKET.on('message:create', ({ conversationId, message }) =>
			handleCreateMessage(conversationId, message),
		)
	}

	function setConversationEventListeners() {
		const conversationCards = Array.from(document.querySelectorAll('#conversation-card'))
		conversationCards.forEach(card =>
			card.removeEventListener(
				'click',
				async e => await openConversation(e, conversationManager.getState().activeConversation),
			),
		)
		conversationCards.forEach(card =>
			card.addEventListener(
				'click',
				async e => await openConversation(e, conversationManager.getState().activeConversation),
			),
		)
	}

	async function logout(e) {
		e.preventDefault()

		await fetchServer('/auth/logout', 'POST')
	}

	// -------------------------------- HELPER --------------------------------
	function handleCreateConversation(conversation) {
		conversation.messageIndicator = true
		conversationManager.dispatch('ADD_CONVERSATION', conversation)
		setConversationEventListeners()
	}

	function handleDeleteConversation(conversationId, leftUserId, message) {
		if (leftUserId === USER_ID) {
			conversationManager.dispatch('DELETE_CONVERSATION', conversationId)
			chatManager.dispatch('RESET')
			setConversationEventListeners()
			requestLeaveRoom(conversationId)
			return
		}
		if (
			conversationManager.getState().activeConversation &&
			conversationManager.getState().activeConversation.conversation.conversation.conversationId === conversationId
		) {
			chatManager.dispatch('ADD_MESSAGE', message)
			return
		}
		conversationManager.dispatch('SET_MESSAGE_INDICATOR', conversationId)
		setConversationEventListeners()
	}

	function handleCreateMessage(conversationId, message) {
		if (
			conversationManager.getState().activeConversation &&
			conversationManager.getState().activeConversation.conversation.conversation.conversationId ===
				conversationId
		) {
			chatManager.dispatch('ADD_MESSAGE', message)
			return
		}
		conversationManager.dispatch('SET_MESSAGE_INDICATOR', conversationId)
		setConversationEventListeners()
	}

	function createListFromParticipants(participants) {
		if (participants.length <= 5) {
			return participants.map(({ username }) => username).join(', ')
		}
		const shortenParticipants = participants.map(({ username }) => username).splice(4)
		return `${shortenParticipants}, ...`
	}

	await init()
}

function nameForConversation(conversation) {
	if (conversation.conversation.conversationName) {
		return conversation.conversation.conversationName
	}
	return conversation.conversationParticipants.filter(({ userId }) => userId !== USER_ID)[0].username
}
