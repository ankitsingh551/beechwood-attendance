function toDateKey(inputDate) {
    if (!inputDate) {
        throw new Error('Date is required');
    }

    if (
        typeof inputDate === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(inputDate)
    ) {
        return inputDate;
    }

    const d = new Date(inputDate);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

module.exports = {
    toDateKey
};