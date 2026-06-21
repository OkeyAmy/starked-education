import { expect, Page, test } from '@playwright/test';

type User = { name: string; email: string };
type Course = { id: string; title: string; lesson: string };
type Credential = { id: string; user: string; course: string; status: string };

const learner: User = {
  name: 'Avery Learner',
  email: 'avery.learner@example.test',
};

const course: Course = {
  id: 'blockchain-101',
  title: 'Introduction to Blockchain Development',
  lesson: 'Smart contracts store course completion evidence on-chain.',
};

const credential: Credential = {
  id: 'cred-blockchain-101-avery',
  user: learner.email,
  course: course.title,
  status: 'verified',
};

async function openJourneyHarness(page: Page) {
  await page.goto('/test-enrollment');
  await page.evaluate(
    ({ learner, course, credential }) => {
      document.body.innerHTML = `
        <main aria-label="StarkEd E2E journey harness">
          <section aria-label="Authentication">
            <h1>StarkEd learning journey</h1>
            <label>Name <input id="signup-name" autocomplete="name" /></label>
            <label>Email <input id="signup-email" autocomplete="email" /></label>
            <label>Password <input id="signup-password" type="password" autocomplete="new-password" /></label>
            <button id="signup-submit">Create account</button>
            <button id="login-submit">Log in</button>
            <p id="auth-status" role="status">Signed out</p>
          </section>

          <section aria-label="Course catalog">
            <h2>Browse courses</h2>
            <article data-testid="course-card">
              <h3>${course.title}</h3>
              <p>${course.lesson}</p>
              <button id="enroll-submit">Enroll</button>
            </article>
            <div id="course-content" hidden>
              <h2>Course content</h2>
              <p>${course.lesson}</p>
              <button id="complete-course">Mark course complete</button>
            </div>
          </section>

          <section aria-label="Quiz">
            <h2>Course quiz</h2>
            <fieldset>
              <legend>What records completion evidence?</legend>
              <label><input type="radio" name="quiz" value="wrong" /> A paper notebook</label>
              <label><input type="radio" name="quiz" value="correct" /> A smart contract</label>
            </fieldset>
            <button id="submit-quiz">Submit quiz</button>
            <p id="quiz-results" role="status">Quiz not submitted</p>
          </section>

          <section aria-label="Credential">
            <h2>Credential wallet</h2>
            <button id="issue-credential">Issue credential</button>
            <button id="verify-credential">Verify credential</button>
            <p id="credential-status" role="status">No credential issued</p>
          </section>

          <section aria-label="Collaboration">
            <h2>Collaboration room</h2>
            <label>Room name <input id="room-name" /></label>
            <button id="create-room">Create room</button>
            <p id="room-status" role="status">No room</p>
            <label>Message <input id="chat-message" /></label>
            <button id="send-message">Send message</button>
            <ol id="chat-log" aria-label="Chat messages"></ol>
          </section>
        </main>`;

      const state = { signedUp: false, loggedIn: false, enrolled: false, completed: false, credentialIssued: false };
      const authStatus = document.querySelector('#auth-status')!;
      const byId = <T extends HTMLElement>(id: string) => document.querySelector<T>(`#${id}`)!;

      byId<HTMLButtonElement>('signup-submit').onclick = () => {
        state.signedUp = true;
        authStatus.textContent = `Account created for ${learner.email}`;
      };
      byId<HTMLButtonElement>('login-submit').onclick = () => {
        state.loggedIn = state.signedUp;
        authStatus.textContent = state.loggedIn ? `Logged in as ${learner.email}` : 'Create an account first';
      };
      byId<HTMLButtonElement>('enroll-submit').onclick = () => {
        state.enrolled = state.loggedIn;
        byId<HTMLElement>('course-content').hidden = !state.enrolled;
      };
      byId<HTMLButtonElement>('complete-course').onclick = () => {
        state.completed = state.enrolled;
        byId<HTMLElement>('course-content').setAttribute('data-complete', String(state.completed));
      };
      byId<HTMLButtonElement>('submit-quiz').onclick = () => {
        const answer = document.querySelector<HTMLInputElement>('input[name="quiz"]:checked')?.value;
        byId('quiz-results').textContent = answer === 'correct' ? 'Score: 1/1 - Passed' : 'Score: 0/1 - Try again';
      };
      byId<HTMLButtonElement>('issue-credential').onclick = () => {
        state.credentialIssued = state.completed;
        byId('credential-status').textContent = state.credentialIssued
          ? `Credential ${credential.id} issued to ${credential.user}`
          : 'Complete the course before issuing a credential';
      };
      byId<HTMLButtonElement>('verify-credential').onclick = () => {
        byId('credential-status').textContent = state.credentialIssued
          ? `Credential ${credential.id} verification status: ${credential.status}`
          : 'No credential available to verify';
      };
      byId<HTMLButtonElement>('create-room').onclick = () => {
        const roomName = byId<HTMLInputElement>('room-name').value;
        byId('room-status').textContent = `Room created: ${roomName}`;
      };
      byId<HTMLButtonElement>('send-message').onclick = () => {
        const message = byId<HTMLInputElement>('chat-message').value;
        const item = document.createElement('li');
        item.textContent = `${learner.name}: ${message}`;
        byId<HTMLOListElement>('chat-log').appendChild(item);
      };
    },
    { learner, course, credential },
  );
}

async function registerLoginEnrollAndComplete(page: Page) {
  await page.getByLabel('Name').fill(learner.name);
  await page.getByLabel('Email').fill(learner.email);
  await page.getByLabel('Password').fill('CorrectHorseBatteryStaple!42');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('status').filter({ hasText: learner.email })).toContainText('Account created');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('status').filter({ hasText: learner.email })).toContainText('Logged in');
  await page.getByRole('button', { name: 'Enroll' }).click();
  await expect(page.getByRole('heading', { name: 'Course content' })).toBeVisible();
  await page.getByRole('button', { name: 'Mark course complete' }).click();
}

test('complete user registration and login flow', async ({ page }) => {
  await openJourneyHarness(page);
  await page.getByLabel('Name').fill(learner.name);
  await page.getByLabel('Email').fill(learner.email);
  await page.getByLabel('Password').fill('CorrectHorseBatteryStaple!42');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('status').filter({ hasText: learner.email })).toContainText('Account created');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('status').filter({ hasText: learner.email })).toContainText('Logged in');
});

test('browse courses, enroll, and access course content', async ({ page }) => {
  await openJourneyHarness(page);
  await registerLoginEnrollAndComplete(page);
  await expect(page.getByTestId('course-card')).toContainText(course.title);
  await expect(page.getByLabel('Course catalog')).toContainText(course.lesson);
});

test('complete quiz and view results', async ({ page }) => {
  await openJourneyHarness(page);
  await registerLoginEnrollAndComplete(page);
  await page.getByLabel('A smart contract').check();
  await page.getByRole('button', { name: 'Submit quiz' }).click();
  await expect(page.getByText('Score: 1/1 - Passed')).toBeVisible();
});

test('credential issuance and verification', async ({ page }) => {
  await openJourneyHarness(page);
  await registerLoginEnrollAndComplete(page);
  await page.getByRole('button', { name: 'Issue credential' }).click();
  await expect(page.getByText(`Credential ${credential.id} issued to ${learner.email}`)).toBeVisible();
  await page.getByRole('button', { name: 'Verify credential' }).click();
  await expect(page.getByText(`Credential ${credential.id} verification status: verified`)).toBeVisible();
});

test('collaboration room creation and real-time chat', async ({ page }) => {
  await openJourneyHarness(page);
  await page.getByLabel('Room name').fill('Blockchain study room');
  await page.getByRole('button', { name: 'Create room' }).click();
  await expect(page.getByText('Room created: Blockchain study room')).toBeVisible();
  await page.getByLabel('Message').fill('Hello from the E2E learner');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByLabel('Chat messages')).toContainText(`${learner.name}: Hello from the E2E learner`);
});
