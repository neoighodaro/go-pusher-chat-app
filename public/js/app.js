(function () {

    'use strict';

    // ----------------------------------------------------
    // Configure Pusher instance
    // ----------------------------------------------------
    var pusher = new Pusher('PUSHER_APP_KEY', {
        authEndpoint: '/pusher/auth',
        cluster: 'PUSHER_APP_CLUSTER',
        encrypted: true
      });

    // ----------------------------------------------------
    // Chat Details
    // ----------------------------------------------------
    let chat = {
        name: undefined,
        email: undefined,
        endUserName: undefined,
        currentRoom: undefined,
        currentChannel: undefined,
        subscribedChannels: [],
        subscribedUsers: []
    }

    // ----------------------------------------------------
    // Subscribe to the update channel
    // ----------------------------------------------------
    var publicChannel = pusher.subscribe('update');

    // ----------------------------------------------------
    // Targeted Elements
    // ----------------------------------------------------
    const chatBody = $(document)
    const chatRoomsList = $('#rooms')
    const chatReplyMessage = $('#replyMessage')

    // ----------------------------------------------------
    // Register helpers
    // ----------------------------------------------------
    const helpers = {

    // ------------------------------------------------------------------
    // Clear the chat messages UI
    // ------------------------------------------------------------------
        clearChatMessages: () => $('#chat-msgs').html(''),

    // ------------------------------------------------------------------
    // Add a new chat message to the chat window.
    // ------------------------------------------------------------------
        displayChatMessage: (message) => {

            if (message.email === chat.email) {
                $('#chat-msgs').prepend(
                    `<tr>
                        <td>
                            <div class="sender">${message.sender} @ <span class="date">${message.createdAt}</span></div>
                            <div class="message">${message.text}</div>
                        </td>
                    </tr>`
                )
            }
        },

    // ------------------------------------------------------------------
    // Select a new user chatroom
    // ------------------------------------------------------------------
        loadChatRoom: evt => {
            chat.currentRoom = evt.target.dataset.roomId
            chat.currentChannel = evt.target.dataset.channelId
            chat.endUserName =  evt.target.dataset.userName

            if (chat.currentRoom !== undefined) {
                $('.response').show()
                $('#room-title').text('Write a message to ' + evt.target.dataset.userName+ '.')
            }

            evt.preventDefault()
            helpers.clearChatMessages()
        },

    // ------------------------------------------ ------------------------
    // Reply a message
    // ------------------------------------------------------------------
        replyMessage: evt => {
            evt.preventDefault()
            let createdAt = new Date()
            createdAt = createdAt.toLocaleString()
            const message = $('#replyMessage input').val().trim()

            chat.subscribedChannels[chat.currentChannel].trigger('client-'+ chat.currentRoom, {
                'sender': chat.name,
                'email': chat.currentRoom,
                'text': message,
                'createdAt': createdAt
            });

            $('#chat-msgs').prepend(
                `<tr>
                    <td>
                        <div class="sender">${chat.name} @ <span class="date">${createdAt}</span></div>
                        <div class="message">${message}</div>
                    </td>
                </tr>`
            )

            $('#replyMessage input').val('')
        },

    // ----------------------------------------------------
    // Logs the user into a chat session.
    // ----------------------------------------------------
    LogIntoChatSession: function (evt) {
        const name  = $('#fullname').val().trim()
        const email = $('#email').val().trim().toLowerCase()

        chat.name = name;
        chat.email = email;

        // Disable the form and swaps the screen
        chatBody.find('#loginScreenForm input, #loginScreenForm button').attr('disabled', true)
        if ((name !== '' && name.length >= 3) && (email !== '' && email.length >= 5)) {
            axios.post('/new/user', {name, email}).then(response => {

                chatBody.find('#registerScreen').css("display", "none");
                chatBody.find('#main').css("display", "block");

                chat.myChannel = pusher.subscribe('private-' + response.data.email);

                // ------------------------------------------------------------------
                // Listen for a new message event from a user
                // ------------------------------------------------------------------
                chat.myChannel.bind('client-' + chat.email, function(data){
                    helpers.displayChatMessage(data)
                })

            })
        } else {
            alert('Enter a valid name and email.')
        }
        evt.preventDefault()
        }
    }

    // ---------------------------------------------------------------------------------
    // Listen to the event on the public channel that returns the details of a new user
    // ---------------------------------------------------------------------------------
      publicChannel.bind('new-user', function(data) {

        if (data.email != chat.email){

        chat.subscribedChannels.push(pusher.subscribe('private-' + data.email));
        chat.subscribedUsers.push(data);

        // re-renders the list of available users when a new user logs in
        $('#rooms').html("");
        chat.subscribedUsers.forEach(function (user, index) {
                $('#rooms').append(
                    `<li class="nav-item"><a data-room-id="${user.email}" data-user-name="${user.name}" data-channel-id="${index}" class="nav-link" href="#">${user.name}</a></li>`
                )
        })

    }
    })


    // ----------------------------------------------------
    // Register page event listeners
    // ----------------------------------------------------
    chatReplyMessage.on('submit', helpers.replyMessage)
    chatRoomsList.on('click', 'li', helpers.loadChatRoom)
    chatBody.find('#loginScreenForm').on('submit', helpers.LogIntoChatSession)
}())
