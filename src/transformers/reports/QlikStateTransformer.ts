import { QlikState } from '../../entities';

const transformQlikState = (qlikState: QlikState): QlikState => {
    const result: QlikState = {
        id: qlikState.id,
        createdAt: qlikState.createdAt,
        updatedAt: qlikState.updatedAt,
    };

    result.qsSelectionHash = qlikState.qsSelectionHash;
    result.meta = qlikState.meta;

    if (qlikState.qsBookmarkId) {
        result.qsBookmarkId = qlikState.qsBookmarkId;
    }

    if (qlikState.selections) {
        result.selections = qlikState.selections;
    }
    return result;
};
export { transformQlikState };
