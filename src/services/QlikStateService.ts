import { injectable } from 'tsyringe';
import { QlikState } from '../entities';
import { handleTextFields } from '../lib/util';

@injectable()
export class QlikStateService {
    constructor() {}
    handleTextFields(data: QlikState) {
        data.selections = data.selections
            ? handleTextFields(data.selections)
            : undefined;
        return data;
    }
}
