document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', () => compose_email('', '', ''));

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email(recipients, subject, body) {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.getElementById('mail-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = recipients;
  document.querySelector('#compose-subject').value = subject;
  document.querySelector('#compose-body').value = body;

  let btn = document.getElementById('submit');

  document.getElementById('compose-form').onsubmit = () => {
    btn.disabled = true;
    btn.value = "Sending...";

    fetch('/emails', {
      method: 'POST',
      body: JSON.stringify({
        recipients: document.getElementById('compose-recipients').value,
        body: document.getElementById('compose-body').value,
        subject: document.getElementById('compose-subject').value
      })
    })
    .then(response => response.json())
    .then(result => {
      btn.disabled = false;
      btn.value = "Send";
      if (result.error === undefined) {
        load_mailbox('sent');
        show_alert(result.message, "info");
      } else {
        show_alert(result.error, "danger");
        console.log(result);
      }
    })

    return false;
  };
}

function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.getElementById('mail-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  // Show the mailbox name
  emailView = document.querySelector('#emails-view');
  emailView.style.display = 'block';
  
  emailView.innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  const p = document.createElement('p');
  p.innerHTML = "Loading...";
  emailView.append(p);

  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
    if (emails.length == 0) {
      p.innerHTML = "Empty!";
    }
    else {
      p.remove();
      emails.forEach(email => {
        const newMail = document.createElement('div');
        newMail.className = "mail";
        if (email.read) newMail.classList.add("read");
        newMail.innerHTML = `
          <div class="part1">
            <span class="email">${email.sender}</span>
            <span class="subject">${email.subject}</span>
          </div>
          <span class="time">${email.timestamp}</span>  
        `;
        newMail.addEventListener('click', () => {
          if (mailbox == "sent") view_email(email.id, null);
          else view_email(email.id, email.archived);
        });
        emailView.append(newMail);
      });
    }
  })
}

function show_alert(message, type) {
  const a = document.getElementById('alert');
  a.innerHTML = message;
  a.className = `alert alert-${type}`;
  setTimeout(() => {
    a.innerHTML = "";
    a.className = "";
  }, 5000);
}

function view_email(id, archived) {
  const mailView = document.getElementById('mail-view');

  document.querySelector('#emails-view').style.display = 'none';
  mailView.style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';

  mailView.innerHTML = "Loading...";

  fetch(`/emails/${id}`)
  .then(response => response.json())
  .then(mail => {
    mailView.innerHTML = `
      <b>From: </b> ${mail.sender} <br>
      <b>To: </b> ${mail.recipients.join(", ")} <br>
      <b>Subject: </b> ${mail.subject} <br>
      <b>Timestamp: </b> ${mail.timestamp} <br>
      <span id="buttons">
        <button class="btn btn-sm btn-outline-primary" id="reply">Reply</button>
      </span>
      <hr>
      ${mail.body.replace(/\n/g, "<br>")}
    `;

    const reply = document.getElementById("reply");
    reply.addEventListener('click', () => {
      let sub = mail.subject;
      if (!sub.startsWith("Re: ")) sub = "Re: " + sub;
      compose_email(mail.sender, sub, `On ${mail.timestamp}, ${mail.sender} wrote:\n"${mail.body}"`)
    })

    if (archived !== null) {
      const b = document.createElement('button');
      b.className = "btn btn-sm btn-outline-primary";
      b.id = "arch";
      b.innerHTML = (archived) ? "Unarchive" : "Archive";
      document.getElementById('buttons').append(b);
      b.addEventListener('click', () => {
        b.disabled = true;
        b.innerHTML = (archived) ? "Unarchiving.." : "Archiving...";
        fetch(`/emails/${mail.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            archived: !mail.archived
          })
        })
        .then(() => {
          show_alert(`Email ${(archived) ? "unarchived" : "archived"}`, "info");
          load_mailbox("inbox");
        })
      })
    }

    if (!mail.read) {
      fetch(`/emails/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          read: true
        })
      })
    }
  })
}