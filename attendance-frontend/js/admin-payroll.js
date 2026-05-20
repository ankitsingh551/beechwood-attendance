document.addEventListener('DOMContentLoaded', () => {

    loadPayroll();

    document.getElementById('generatePayrollBtn')
        .addEventListener('click', generatePayroll);

});

// ============================================
// GENERATE PAYROLL
// ============================================

async function generatePayroll() {

    try {

        const btn = document.getElementById(
            'generatePayrollBtn'
        );

        btn.disabled = true;

        btn.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            Generating...
        `;

        const month =
            document.getElementById(
                'payrollMonth'
            ).value;

        const year =
            document.getElementById(
                'payrollYear'
            ).value;

        const response = await fetch(
            '/api/payroll/generate',
            {

                method: 'POST',

                headers: {

                    'Content-Type':
                        'application/json',

                    'Authorization':
                        `Bearer ${localStorage.getItem('token')}`
                },

                body: JSON.stringify({
                    month,
                    year
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.message ||
                'Payroll generation failed'
            );
        }

        alert('Payroll Generated Successfully');

        await loadPayroll();

    } catch (error) {

        console.error(error);

        alert(error.message);

    } finally {

        const btn = document.getElementById(
            'generatePayrollBtn'
        );

        btn.disabled = false;

        btn.innerHTML = `
            <i class="fas fa-calculator"></i>
            Generate Payroll
        `;
    }
}

// ============================================
// LOAD PAYROLL
// ============================================

async function loadPayroll() {

    try {

        const month =
            document.getElementById(
                'payrollMonth'
            ).value;

        const year =
            document.getElementById(
                'payrollYear'
            ).value;

        const response = await fetch(
            `/api/payroll/monthly?month=${month}&year=${year}`,
            {

                headers: {

                    'Authorization':
                        `Bearer ${localStorage.getItem('token')}`
                }
            }
        );

        const result = await response.json();

        const tbody =
            document.getElementById(
                'payrollTableBody'
            );

        tbody.innerHTML = '';

        // ============================================
        // EMPTY PAYROLL
        // ============================================

        if (
            !result.data ||
            result.data.length === 0
        ) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-5">
                        No payroll found
                    </td>
                </tr>
            `;

            return;
        }

        // ============================================
        // SUMMARY TOTALS
        // ============================================

        let totalPayroll = 0;
        let totalTDS = 0;
        let totalNet = 0;

        result.data.forEach(payroll => {

            totalPayroll +=
                payroll.grossSalary || 0;

            totalTDS +=
                payroll.tdsAmount || 0;

            totalNet +=
                payroll.netSalary || 0;

            tbody.innerHTML += `

            <tr>

                <td>
                    ${payroll.employeeId?.firstName || ''}
                    ${payroll.employeeId?.lastName || ''}
                </td>

                <td>
                    ${payroll.employeeId?.designation || '-'}
                </td>

                <td>
                    ${payroll.workedHours?.toFixed(2) || '0.00'}
                </td>

                <td>
                    ₹${payroll.grossSalary?.toFixed(2) || '0.00'}
                </td>

                <td>
                    ${payroll.tdsPercentage || 0}%
                </td>

                <td class="salary-highlight">
                    ₹${payroll.netSalary?.toFixed(2) || '0.00'}
                </td>

                <td>

                    <button
                        class="
                            btn
                            btn-sm
                            payment-status-btn

                            ${
                                payroll.paymentStatus === 'PAID'
                                    ? 'btn-success'
                                    : 'btn-danger'
                            }
                        "

                        data-id="${payroll._id}"

                        data-status="${payroll.paymentStatus}"

                    >

                        ${
                            payroll.paymentStatus === 'PAID'
                                ? 'Paid'
                                : 'Unpaid'
                        }

                    </button>

                </td>

                <td>

                    ${
                        payroll.paymentStatus === 'PAID'

                        ? `

                            <button
                                class="btn btn-success btn-sm"
                                disabled
                            >
                                <i class="fas fa-lock"></i>
                                Paid
                            </button>

                        `

                        : `

                            <button
                                class="btn btn-warning btn-sm edit-payroll-btn"
                                data-id="${payroll._id}"
                            >
                                <i class="fas fa-edit"></i>
                                Edit
                            </button>

                        `
                    }

                </td>

                <td>

                    <textarea
                        class="form-control payroll-remark auto-expand-remark"
                        rows="1"
                        data-id="${payroll._id}"
                        style="
                            min-height: 38px;
                            resize: none;
                            overflow: hidden;
                        "
                    >${payroll.remarks || ''}</textarea>

                </td>

            </tr>
            `;
        });

        // ============================================
        // EDIT BUTTON EVENTS
        // ============================================

        document
            .querySelectorAll('.edit-payroll-btn')
            .forEach(button => {

                button.addEventListener(
                    'click',
                    (event) => {

                        const payrollId =
                            button.getAttribute(
                                'data-id'
                            );

                        editPayroll(
                            payrollId,
                            event
                        );
                    }
                );
            });

        // ============================================
        // PAYMENT STATUS TOGGLE
        // ============================================

        document
            .querySelectorAll('.payment-status-btn')
            .forEach(button => {

                button.addEventListener(
                    'click',
                    async () => {

                        const payrollId =
                            button.getAttribute(
                                'data-id'
                            );

                        const currentStatus =
                            button.getAttribute(
                                'data-status'
                            );

                        const newStatus =
                            currentStatus === 'PAID'
                                ? 'UNPAID'
                                : 'PAID';

                        try {

                            const response =
                                await fetch(
                                    `/api/payroll/${payrollId}`,
                                    {

                                        method: 'PUT',

                                        headers: {

                                            'Content-Type':
                                                'application/json',

                                            'Authorization':
                                                `Bearer ${localStorage.getItem('token')}`
                                        },

                                        body: JSON.stringify({
                                            paymentStatus:
                                                newStatus
                                        })
                                    }
                                );

                            const result =
                                await response.json();

                            if (result.success) {

                                await loadPayroll();
                            }

                        } catch (error) {

                            console.error(error);
                        }
                    }
                );
            });

        // ============================================
        // AUTO EXPAND REMARKS
        // ============================================

        document
            .querySelectorAll('.auto-expand-remark')
            .forEach(textarea => {

                textarea.style.height = '38px';

                textarea.addEventListener(
                    'input',
                    () => {

                        textarea.style.height =
                            '38px';

                        textarea.style.height =
                            textarea.scrollHeight +
                            'px';
                    }
                );
            });

        // ============================================
        // REMARK AUTO SAVE
        // ============================================

        document
            .querySelectorAll('.payroll-remark')
            .forEach(textarea => {

                textarea.addEventListener(
                    'input',
                    async () => {

                        const payrollId =
                            textarea.getAttribute(
                                'data-id'
                            );

                        const remarks =
                            textarea.value;

                        try {

                            await fetch(
                                `/api/payroll/${payrollId}`,
                                {

                                    method: 'PUT',

                                    headers: {

                                        'Content-Type':
                                            'application/json',

                                        'Authorization':
                                            `Bearer ${localStorage.getItem('token')}`
                                    },

                                    body: JSON.stringify({
                                        remarks
                                    })
                                }
                            );

                        } catch (error) {

                            console.error(error);
                        }
                    }
                );
            });

        // ============================================
        // UPDATE DASHBOARD CARDS
        // ============================================

        document.getElementById(
            'totalPayroll'
        ).textContent =
            `₹${totalPayroll.toFixed(2)}`;

        document.getElementById(
            'employeesProcessed'
        ).textContent =
            result.data.length;

        document.getElementById(
            'totalTDS'
        ).textContent =
            `₹${totalTDS.toFixed(2)}`;

        document.getElementById(
            'netPayable'
        ).textContent =
            `₹${totalNet.toFixed(2)}`;

    } catch (error) {

        console.error(error);
    }
}

// ============================================
// EXPORT EXCEL
// ============================================

document.getElementById('exportExcelBtn')
    .addEventListener(
        'click',
        exportPayrollExcel
    );

function exportPayrollExcel() {

    const payrollData = [];

    const rows =
        document.querySelectorAll(
            '#payrollTableBody tr'
        );

    rows.forEach(row => {

        const cols =
            row.querySelectorAll('td');

        if (cols.length < 6) return;

        payrollData.push({

            Employee:
                cols[0].innerText.trim(),

            Designation:
                cols[1].innerText.trim(),

            WorkedHours:
                cols[2].innerText.trim(),

            GrossSalary:
                cols[3].innerText.trim(),

            TDS:
                cols[4].innerText.trim(),

            NetSalary:
                cols[5].innerText.trim(),

            Status:
                cols[6].innerText.trim(),

            Remarks:
                cols[8]
                    .querySelector('textarea')
                    ?.value || ''
        });
    });

    const worksheet =
        XLSX.utils.json_to_sheet(
            payrollData
        );

    const workbook =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'Payroll'
    );

    XLSX.writeFile(
        workbook,
        'Payroll_Report.xlsx'
    );
}

// ============================================
// EDIT PAYROLL MODAL
// ============================================

let currentPayrollId = null;

async function editPayroll(payrollId, event) {

    currentPayrollId = payrollId;

    const row =
        event.target.closest('tr');

    const workedHours =
        row.children[2].innerText.trim();

    const grossSalary =
        row.children[3]
            .innerText
            .replace('₹', '')
            .replace(',', '')
            .trim();

    const tds =
        row.children[4]
            .innerText
            .replace('%', '')
            .trim();

    // ============================================
    // PREFILL FORM
    // ============================================

    document.getElementById(
        'editWorkedHours'
    ).value = workedHours;

    document.getElementById(
        'editGrossSalary'
    ).value = grossSalary;

    document.getElementById(
        'editTDS'
    ).value = tds;

    // ============================================
    // OPEN MODAL
    // ============================================

    const modal = new bootstrap.Modal(
        document.getElementById(
            'editPayrollModal'
        )
    );

    modal.show();
}

// ============================================
// SAVE PAYROLL CHANGES
// ============================================

document.getElementById(
    'savePayrollChangesBtn'
).addEventListener(
    'click',
    savePayrollChanges
);

async function savePayrollChanges() {

    const workedHours =
        document.getElementById(
            'editWorkedHours'
        ).value;

    const grossSalary =
        document.getElementById(
            'editGrossSalary'
        ).value;

    const tdsPercentage =
        document.getElementById(
            'editTDS'
        ).value;

    try {

        const response = await fetch(
            `/api/payroll/${currentPayrollId}`,
            {

                method: 'PUT',

                headers: {

                    'Content-Type':
                        'application/json',

                    'Authorization':
                        `Bearer ${localStorage.getItem('token')}`
                },

                body: JSON.stringify({

                    workedHours,

                    grossSalary,

                    tdsPercentage
                })
            }
        );

        const result =
            await response.json();

        if (result.success) {

            alert(
                'Payroll Updated Successfully'
            );

            bootstrap.Modal.getInstance(
                document.getElementById(
                    'editPayrollModal'
                )
            ).hide();

            await loadPayroll();

        } else {

            alert(result.message);
        }

    } catch (error) {

        console.error(error);

        alert('Error Updating Payroll');
    }
}