const saveBtn = document.getElementById('save');
const loadBtn = document.getElementById('load');
const refreshPageBtn = document.getElementById('refreshPage');


const inputIdsToProcess = [
    'acnum', 'icaoFrom', 'icaoTo', 'icaoAlt',
    'acnumOld', 'ad', 'avgwcOld', 'tripFuelOld', 'ttOld', 'totalFuelOld', 'payloadOld', 'eldwOld',
    'route', 'payloadActual', 'dtUtc', 'avgwcNew',
    'adCalcSim', 'tripFuelCalcSim', 'tripTimeCalcSim', 'f2CalcSim'
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
    localStorage.setItem('fuelCalcLastOfp', lastPlanHTML || '');

    const o = setInnerHtml('save', '<i class="fa-solid fa-check"></i> Сохранено');
    setInnerHtml('save', o, 2_000);
});

loadBtn.addEventListener('click', () => {
    const fuelCalcInputsValues = JSON.parse(localStorage.getItem('fuelCalcInputsValues') || '{}');
    Object.entries(fuelCalcInputsValues).forEach(([id, value]) => {
        setValue(id, value);
    });

    lastPlanHTML = localStorage.getItem('fuelCalcLastOfp');

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

function openOFPModal() {
    if (!lastPlanHTML) {
        alert('Нет загруженного OFP (plan_html). Сначала нажми «Рассчитать и получить ветер».');
        return;
    }
    const modal = document.getElementById('ofpModal');
    const content = document.getElementById('ofpContent');
    content.innerHTML = lastPlanHTML; // осознанно рендерим HTML
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeOFPModal() {
    const modal = document.getElementById('ofpModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    // контент можно не чистить, чтобы быстрее открывалось повторно
}

// Кнопка-триггер (принтер-иконка)
document.getElementById('setNowDat1e').addEventListener('click', openOFPModal);

// Закрытия
document.getElementById('ofpClose').addEventListener('click', closeOFPModal);
document.querySelector('#ofpModal .modal-backdrop').addEventListener('click', closeOFPModal);
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOFPModal();
});