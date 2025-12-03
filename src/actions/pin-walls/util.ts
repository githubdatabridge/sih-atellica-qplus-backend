const parseTextFields = (field) => {
    if (field === null) {
        return field;
    }

    if (typeof field === 'string') {
        return JSON.parse(field);
    }

    if (typeof field === 'object') {
        return JSON.stringify(field);
    }

    return field;
};

export { parseTextFields };
