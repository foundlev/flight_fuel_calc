const saveBtn = document.getElementById('save');
const loadBtn = document.getElementById('load');
const refreshPageBtn = document.getElementById('refreshPage');


const inputIdsToProcess = [
    'acnum', 'icaoFrom', 'icaoTo', 'icaoAlt',
    'acnumOld', 'ad', 'avgwcOld', 'tripFuelOld', 'ttOld', 'totalFuelOld', 'payloadOld', 'eldwOld',
    'route', 'payloadActual', 'dtUtc', 'avgwcNew'
]

saveBtn.addEventListener('click', () => {
    const result = {};
    inputIdsToProcess.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            result[id] = element.value;
        }
    });

    localStorage.setItem('fuelCalcInputsValues', JSON.stringify(result));

    const o = setInnerHtml('save', '<i class="fa-solid fa-check"></i> Сохранено');
    setInnerHtml('save', o, 2_000);
});

loadBtn.addEventListener('click', () => {
    const fuelCalcInputsValues = JSON.parse(localStorage.getItem('fuelCalcInputsValues') || '{}');
    Object.entries(fuelCalcInputsValues).forEach(([id, value]) => {
        setValue(id, value);
    });

    chk();
    const o = setInnerHtml('load', '<i class="fa-solid fa-check"></i> Загружено');
    setInnerHtml('load', o, 2_000);
});

refreshPageBtn.addEventListener('click', () => {
    const userConfirmed = confirm('Вы уверены, что хотите сбросить данные? Убедитесь, что сохранили перед этим всё необходимое.');
    if (userConfirmed) {
        location.reload();
    }
});
