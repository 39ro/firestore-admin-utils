import * as firebase from '@firebase/testing';
import FirestoreAdminUtils from './helpers';

const firestoreAdminUtils = new FirestoreAdminUtils();

const PROJECT_ID = `firestore-utils-project-${new Date().getTime()}`;

let app: any;
let db: any;

beforeAll(async () => {
  // Init application
  app = firebase.initializeTestApp({
    projectId: PROJECT_ID
  });
  db = app.firestore();
});

beforeEach(async () => {
  // Clean Firestore Dataset and applications
  await firebase.clearFirestoreData({
    projectId: 'firestore-utils-project'
  });
});

afterAll(async () => {
  await firebase.apps().map(app => app.delete());
});

test('ref.renameFieldDocs', async () => {
  const USERS = [{uid: 'a', nme: 'Giovanni'}, {uid: 'b', name: 'Giovanni'}];
  const USERS_EXPECTED = [{uid: 'a', name: 'Giovanni'}, {uid: 'b', name: 'Giovanni'}];
  // set document
  const colRef = db.collection('test_users');

  const doc0 = colRef.doc('a');
  const doc1 = colRef.doc('b');

  await doc0.set(USERS[0]);
  await doc1.set(USERS[1]);

  await firestoreAdminUtils
    .ref(colRef)
    .renameFieldDocs({nme: 'name'});

  const doc0Data = await doc0.get();
  const doc1Data = await doc1.get();

  // value should be the same in both documents
  expect(doc0Data.data()).toMatchObject(USERS_EXPECTED[0]);
  expect(doc1Data.data()).toMatchObject(USERS_EXPECTED[1]);
});

test('ref.deleteFieldDocs', async () => {
  const USERS = [{uid: 'a', nme: 'Giovanni'}, {uid: 'b', nme: 'Giovanni'}];
  const USERS_EXPECTED = [{uid: 'a'}, {uid: 'b'}];
  // set document
  const colRef = db.collection('test_users');

  const doc0 = colRef.doc('a');
  const doc1 = colRef.doc('b');

  await doc0.set(USERS[0]);
  await doc1.set(USERS[1]);

  await firestoreAdminUtils
    .ref(colRef)
    .deleteFieldDocs('nme');

  const doc0Data = await doc0.get();
  const doc1Data = await doc1.get();

  // value should be the same in both documents
  expect(doc0Data.data().name).toBe(undefined);
  expect(doc1Data.data().name).toBe(undefined);
  expect(JSON.stringify(doc0Data.data())).toBe(JSON.stringify(USERS_EXPECTED[0]));
  expect(JSON.stringify(doc1Data.data())).toBe(JSON.stringify(USERS_EXPECTED[1]));
});