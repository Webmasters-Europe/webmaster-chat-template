window.addEventListener('DOMContentLoaded', init)

function init() {
	const usernameInput = document.getElementById('username')
	const passwordInput = document.getElementById('password')
	const passwordConfirmInput = document.getElementById('password-confirmation')
	const usernameErrorSpan = document.getElementById('error-username')
	const passwordErrorSpan = document.getElementById('error-password')
	const form = document.querySelector('form')

	function createStore(initialState, reducer) {
		const state = new Proxy(
			{ value: initialState },
			{
				set(obj, prop, value) {
					obj[prop] = value
					obj.value.usernameErrorValue === value.usernameErrorValue && updateUsernameErrorSpan()
					obj.value.passwordErrorValue === value.passwordErrorValue && updatePasswordErrorSpan()
				},
			},
		)

		function getState() {
			return { ...state.value }
		}

		function dispatch(action, message = '') {
			const prevState = getState()
			state.value = reducer(prevState, action, message)
		}

		return {
			getState,
			dispatch,
		}
	}

	const initialState = { passwordErrorValue: '', usernameErrorValue: '' }

	function reducer(state, action, message) {
		switch (action) {
			case 'USERNAME_INVALID':
				state = {
					...state,
					usernameErrorValue:
						`${state.usernameErrorValue}\nUsername must contain at least three characters \nValid characters: a-z, A-Z, 0-9, _`.trim(),
				}
				break
			case 'USERNAME_CUSTOM_MESSAGE':
				state = {
					...state,
					usernameErrorValue: `${state.usernameErrorValue}\n${message}`.trim(),
				}
				break
			case 'USERNAME_RESET':
				state = { ...state, usernameErrorValue: '' }
				break
			case 'PASSWORD_INVALID':
				state = {
					...state,
					passwordErrorValue:
						`${state.passwordErrorValue}\nPassword must contain at least eight characters \nOne of each group: a-z, A-Z, 0-9, _!$?`.trim(),
				}
				break
			case 'PASSWORD_UNEQUAL':
				state = {
					...state,
					passwordErrorValue:
						`${state.passwordErrorValue}\nPassword and Confirm Password must be identical`.trim(),
				}
				break
			case 'PASSWORD_CUSTOM_MESSAGE':
				state = {
					...state,
					passwordErrorValue: `${state.passwordErrorValue}\n${message}`.trim(),
				}
				break
			case 'PASSWORD_RESET':
				state = { ...state, passwordErrorValue: '' }
				break
		}
		return state
	}

	const store = createStore(initialState, reducer)

	function updateUsernameErrorSpan() {
		usernameErrorSpan.innerText = store.getState().usernameErrorValue
	}

	function updatePasswordErrorSpan() {
		passwordErrorSpan.innerText = store.getState().passwordErrorValue
	}

	// -------------------------------- EVENT HANDLER --------------------------------

	function checkUsername(e) {
		e.preventDefault()
		store.dispatch('USERNAME_RESET')
		const regex = new RegExp(/^([\w]+){3,}$/)
		const valid = regex.test(usernameInput.value.trim())
		if (valid) return
		store.dispatch('USERNAME_INVALID')
	}

	function checkPassword(e) {
		e.preventDefault()
		store.dispatch('PASSWORD_RESET')
		validatePassword()
		comparePasswords()
	}

	function validatePassword() {
		const regex = new RegExp(/^(?=.*?[\w]+)(?=.*?[!$_?]+).{8,}$/)
		const valid = regex.test(passwordInput.value.trim())
		if (valid) return
		store.dispatch('PASSWORD_INVALID')
	}

	function comparePasswords() {
		if (
			passwordInput.value.trim() === '' ||
			passwordConfirmInput.value.trim() === '' ||
			passwordInput.value.trim() === passwordConfirmInput.value.trim()
		)
			return
		store.dispatch('PASSWORD_UNEQUAL')
	}

	async function handleSubmit(e) {
		e.preventDefault()
		if (store.getState().usernameErrorValue || store.getState().passwordErrorValue) return
		const body = createJSONBody(e.target)
		const response = await fetchServer(`${SERVER_IP}/auth/register`, 'POST', body)
		if (response?.error?.type === 'username') {
			store.dispatch('USERNAME_CUSTOM_MESSAGE', response.error.message)
		}
		if (response?.error?.type === 'password') {
			store.dispatch('PASSWORD_CUSTOM_MESSAGE', response.error.message)
		}
	}

	function createJSONBody(form) {
		const data = new FormData(form)
		const body = Object.fromEntries(data)
		return JSON.stringify(body)
	}

	usernameInput.addEventListener('input', checkUsername)
	passwordInput.addEventListener('input', checkPassword)
	passwordConfirmInput.addEventListener('input', checkPassword)
	form.addEventListener('submit', handleSubmit)
}
