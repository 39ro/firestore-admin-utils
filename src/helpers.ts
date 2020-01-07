import * as admin from 'firebase-admin';
import {firestore} from 'firebase';

import FieldValue = firestore.FieldValue;

import DocumentReference = admin.firestore.DocumentReference;
import DocumentSnapshot = admin.firestore.DocumentSnapshot;
import CollectionReference = admin.firestore.CollectionReference;
import WriteResult = admin.firestore.WriteResult;

import TestCollectionReference = firestore.CollectionReference;
import TestDocumentReference = firestore.DocumentReference;

class ReferenceHelper<T extends CollectionReference | DocumentReference> {
  readonly reference: T;

  readonly db: any;

  constructor(ref: T) {
    this.reference = ref;
    this.db = this.reference.firestore;
  }
}

export class DocumentReferenceHelper extends ReferenceHelper<DocumentReference> {
  /*
   * For the referenced document performs a update operation of the new field key, and then performs, if it exist, a remove operation of the old field key
   *
   * Rename does nothing if:
   * - old field key doesn't exist and new field not exist
   * - new field key already exist and old field not exist
   *
   * .ref(colRef)
   * .renameField({oldFieldKey: 'newFieldKey'})
   */
  async renameField(arg: { [key: string]: string }): Promise<WriteResult | WriteResult[] | null> {
    if (Object.entries(arg).length <= 0) {
      throw new Error('Rename need arguments');
    }

    const entries = Object.entries(arg);
    const oldNameField = entries[0][0];
    const newNameField = entries[0][1];

    const docGet = await this.reference.get();
    const docData: any = docGet.data();

    // doc not exist
    if (!docGet.exists) {
      return null;
    }

    // New field already exist, old field not exist
    if (docData[newNameField] && !docData[oldNameField]) {
      return null;
    }

    // old field key not exist and new field key not exist
    if (!docData[newNameField] && !docData[oldNameField]) {
      return null;
    }

    // Both old and new fields key exists, delete old field key
    if (docData[oldNameField] && docData[newNameField]) {
      return this.reference.update({[oldNameField]: FieldValue.delete()});
    }

    // old key exist and new key not exist, update doc with new field key preserving old field value, then delete old field key
    if (docData[oldNameField] && !docData[newNameField]) {
      return Promise.all([
        this.reference.update({[newNameField]: docData[oldNameField]}),
        this.reference.update({[oldNameField]: FieldValue.delete()})
      ]);
    }

    return null;
  }
}

export class CollectionReferenceHelper extends ReferenceHelper<CollectionReference> {
  /*
   * For each documents in a referenced collection performs a update operation of the new field key, and then performs, if it exist, a remove operation of the old field key
   * If the old field key doesn't exist "rename" does nothing.
   *
   * Check DocumentReferenceHelper.renameField for more info
   *
   * .ref(colRef)
   * .renameFieldDocs({oldFieldKey: 'newFieldKey'})
   */
  async renameFieldDocs(arg: { [key: string]: string }): Promise<admin.firestore.WriteResult[][]> {
    const snapshot = await this.db.collection(this.reference.id).get();
    const arr = snapshot.docs.map((doc: DocumentSnapshot) => new DocumentReferenceHelper(doc.ref).renameField(arg));
    return Promise.all(arr);
  }

  /*
   * For each documents in a referenced collection performs a delete operation of the old field key
   *
   * .ref(colRef)
   * .deleteFieldDocs('fieldKeyToDelete')
   */
  async deleteFieldDocs(fieldKey: string): Promise<admin.firestore.WriteResult[][]> {
    const snapshot = await this.db.collection(this.reference.id).get();
    const arr = snapshot.docs.map((doc: DocumentSnapshot) => doc.ref.update({[fieldKey]: FieldValue.delete()}));
    return Promise.all(arr);
  }

  /*
   * Allow to import documents in a collection using a bulk operation
   *
   * .ref(colRef)
   * .importDocs({uid: '1'}, {uid: '2', name: 'Giovanni'})
   */
  importDocs(...args: any[]): Promise<admin.firestore.WriteResult[]> {
    const arr = args.map(docData => {
      const docId = docData.id ? docData.id : this.db.collection('test').doc().id;
      return this.db.collection(this.reference.id).doc(docId).set({id: docId, ...docData});
    });
    return Promise.all(arr);
  }
}

export default class FirestoreAdminUtils {
  ref(r: TestDocumentReference | DocumentReference | TestCollectionReference | CollectionReference): any {
    if (!r) {
      throw new Error('Collection reference need to be set');
    }
    if (this.isDocumentReference(r)) {
      return new DocumentReferenceHelper(r as any);
    }
    if (this.isCollectionReference(r)) {
      return new CollectionReferenceHelper(r as any);
    }
    throw new Error('Something went wrong');
  }

  isDocumentReference(arg: any): boolean {
    return arg instanceof TestDocumentReference || arg instanceof DocumentReference;
  }

  isCollectionReference(arg: any): boolean {
    return arg instanceof TestCollectionReference || arg instanceof CollectionReference;
  }
}