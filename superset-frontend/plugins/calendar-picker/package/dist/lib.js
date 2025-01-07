// Calendar Picker Plugin for Apache Superset
// Dependencies imports
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';
import { styled } from '@emotion/react';
import { t, styled as supersetStyled } from '@superset-ui/core';
import { sharedControls } from '@superset-ui/chart-controls';
import { DateRange, DateRangePicker, createStaticRanges } from 'react-date-range';
import { Button, Select, Modal } from 'antd';
import { CalendarOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { 
  startOfDay, 
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths
} from 'date-fns';

// Constants
const DATE_FORMAT = 'YYYY-MM-DD[T]HH:mm:ss';
const { Option } = Select;

// Time grain mappings
const TIME_GRAIN_MAP = {
  'TimeGrain.SECOND': 'PT1S',
  'TimeGrain.MINUTE': 'PT1M', 
  'TimeGrain.FIVE_MINUTES': 'PT5M',
  'TimeGrain.TEN_MINUTES': 'PT10M',
  'TimeGrain.FIFTEEN_MINUTES': 'PT15M',
  'TimeGrain.THIRTY_MINUTES': 'PT30M',
  'TimeGrain.HOUR': 'PT1H',
  'TimeGrain.DAY': 'P1D',
  'TimeGrain.WEEK': 'P1W', 
  'TimeGrain.MONTH': 'P1M',
  'TimeGrain.QUARTER': 'P3M',
  'TimeGrain.YEAR': 'P1Y',
  'TimeGrain.WEEK_STARTING_MONDAY': '1969-12-28T00:00:00Z/P1W'
};

const TIME_GRAIN_LABELS = {
  'TimeGrain.SECOND': 'Second',
  'TimeGrain.MINUTE': 'Minute',
  'TimeGrain.FIVE_MINUTES': '5 minute',
  'TimeGrain.TEN_MINUTES': '10 minute', 
  'TimeGrain.FIFTEEN_MINUTES': '15 minute',
  'TimeGrain.THIRTY_MINUTES': '30 minute',
  'TimeGrain.HOUR': 'Hour',
  'TimeGrain.DAY': 'Day',
  'TimeGrain.WEEK': 'Week',
  'TimeGrain.MONTH': 'Month', 
  'TimeGrain.QUARTER': 'Quarter',
  'TimeGrain.YEAR': 'Year',
  'TimeGrain.WEEK_STARTING_MONDAY': 'Week starting Monday'
};

// Styled components
const CalendarWrapper = styled.div`
  background: linear-gradient(135deg, #b5d2d836, #d0f5fc47);
  padding: 20px;  
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  max-width: 300px;
  margin: 0 auto;
  color: #333;
`;

const StyledSpan = styled.span`
  font-weight: bold;
`;

const StyledDiv = styled.div`
  font-weight: 600;
  font-size: 12;
  margin-bottom: 4px;
`;

const StyledModal = styled(Modal)`
  .ant-modal-content {
    width: fit-content;
  }
`;

// Calendar component
export function CalendarPicker(props) {
  const {
    data,
    setDataMask,
    cols,
    buttonHeight,
    buttonWidth, 
    popupPresist,
    showPresets,
    defaultButtonText,
    defaultStartDate,
    defaultEndDate,
    showTimegrain,
    defaultTimeGrain,
    showInNativeFilter,
    showInNativeFilterLabel,
    HideonViewMode,
    sliceId,
    weekStartsOn,
    showCalenderIcon,
    status,
    nDaysAgo,
    timeGrainSqla
  } = props;

  // Native filter setup
  const filterBar = document.querySelector('[data-test="filter-bar"] > div:nth-of-type(2) > div:nth-of-type(2)');
  
  if (showInNativeFilter && filterBar) {
    const chartDiv = document.querySelector('.dashboard-chart-id-' + sliceId);
    chartDiv.style.display = 'block';
    if (chartDiv && HideonViewMode) {
      chartDiv.style.display = 'none';
    }
  } else {
    const chartDiv = document.querySelector('.dashboard-chart-id-' + sliceId);
    if (chartDiv) {
      chartDiv.style.display = 'block'; 
    }
  }

  // Handle data mask updates
  const handleDataMaskUpdate = useCallback((ranges, timeGrain) => {
    let dateRange = ranges;
    let [startDate, endDate] = [ranges[0].startDate, ranges[0].endDate];
    const timeGrainLabel = timeGrain ? ` ( ${TIME_GRAIN_LABELS[timeGrain]} )` : '';

    if (startDate && endDate) {
      if (dateRange) {
        startDate = moment(startDate).format(DATE_FORMAT);
        endDate = moment(endDate).add(1,'d').format(DATE_FORMAT);
      }
      
      setDataMask({
        extraFormData: {
          time_range: [startDate, endDate].join(' : '),
          time_grain_sqla: TIME_GRAIN_MAP[timeGrain]
        },
        filterState: {
          value: [
            moment(startDate).format('MMM DD, YYYY'),
            moment(endDate).format('MMM DD, YYYY') + timeGrainLabel
          ]
        }
      });
    } else if (timeGrain) {
      setDataMask({
        extraFormData: {
          time_grain_sqla: TIME_GRAIN_MAP[timeGrain]
        },
        filterState: {
          value: [timeGrainLabel]
        }
      });
    }
  }, [setDataMask]);

  // Get date range bounds
  function getDateBounds(data, column) {
    if (data.length === 0) {
      return { minDate: null, maxDate: null };
    }

    const bounds = {
      minDate: data[0][column],
      maxDate: data[0][column]
    };

    return data.reduce((acc, row) => {
      const value = row[column];
      if (value < acc.minDate) acc.minDate = value;
      if (value > acc.maxDate) acc.maxDate = value;
      return acc;
    }, bounds);
  }

  // Helper functions
  function isValidDate(date) {
    return !!date && String(date).length > 0;
  }

  // State management
  const [selectedTimeGrain, setSelectedTimeGrain] = useState(defaultTimeGrain || null);
  
  const TimeGrainSelect = () => {
    return (
      <Select
        placeholder="Select a time grain"
        onChange={value => setSelectedTimeGrain(value)}
        style={{ width: 170, marginRight: 10 }}
        value={selectedTimeGrain}
        suffixIcon={
          <CloseCircleOutlined
            style={{ color: 'rgba(0, 0, 0, 0.25)', cursor: 'pointer' }}
            onClick={() => setSelectedTimeGrain('')}
          />
        }
      >
        <Option value="">Select a time grain</Option>
        {timeGrainSqla.map(([value, label]) => (
          <Option key={value} value={value}>
            {label}
          </Option>
        ))}
      </Select>
    );
  };

  useEffect(() => {
    setSelectedTimeGrain(defaultTimeGrain);
  }, [defaultTimeGrain]);

  // Date range setup
  const defaultDateRange = [{
    startDate: isValidDate(defaultStartDate) ? new Date(defaultStartDate) : null,
    endDate: isValidDate(defaultEndDate) ? new Date(defaultEndDate) : new Date(''),
    key: 'selection'
  }];

  const emptyDateRange = [{
    startDate: null,
    endDate: new Date(''),
    key: 'selection'
  }];

  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [selectedRange, setSelectedRange] = useState(defaultDateRange);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [focusedRange, setFocusedRange] = useState([0, 0]);

  useEffect(() => {
    if (status === 200) {
      setDateRange(defaultDateRange);
      setSelectedRange(defaultDateRange);
      handleDataMaskUpdate(defaultDateRange, selectedTimeGrain);
    }
  }, [status, nDaysAgo, defaultTimeGrain]);

  // Calendar modal component
  class CalendarModal extends React.Component {
    render() {
      const handleAction = (action) => {
        if (action === 'Apply') {
          setSelectedRange(dateRange);
          handleDataMaskUpdate(dateRange, selectedTimeGrain);
          if (!popupPresist) {
            setShowModal(false);
          }
        }
        if (action === 'Clear') {
          setDateRange(emptyDateRange);
          setSelectedRange(emptyDateRange);
          setDataMask({
            extraFormData: {},
            filterState: { value: '' }
          });
          setSelectedTimeGrain(null);
          setFocusedRange([0, 0]);
          if (!popupPresist) {
            setShowModal(false);
          }
        }
      };

      const handleRangeFocusChange = (range) => {
        setFocusedRange(range);
      };

      // Define preset ranges
      const definedRanges = createStaticRanges([
        {
          label: 'Today',
          range: () => ({
            startDate: startOfDay(new Date()),
            endDate: endOfDay(new Date())
          })
        },
        {
          label: 'Yesterday',
          range: () => ({
            startDate: startOfDay(subDays(new Date(), 1)),
            endDate: endOfDay(subDays(new Date(), 1))
          })
        },
        {
          label: 'Last 7 Days',
          range: () => ({
            startDate: startOfDay(subDays(new Date(), 6)),
            endDate: endOfDay(new Date())
          })
        },
        {
          label: 'This Week',
          range: () => ({
            startDate: startOfDay(startOfWeek(new Date(), { weekStartsOn })),
            endDate: endOfDay(endOfWeek(new Date(), { weekStartsOn }))
          })
        },
        {
          label: 'Last Week',
          range: () => {
            const start = startOfWeek(subDays(new Date(), 7), { weekStartsOn });
            const end = endOfWeek(subDays(new Date(), 7), { weekStartsOn });
            return {
              startDate: startOfDay(start),
              endDate: endOfDay(end)
            };
          }
        },
        {
          label: 'Last 28 Days',
          range: () => ({
            startDate: startOfDay(subDays(new Date(), 27)),
            endDate: endOfDay(new Date())
          })
        },
        {
          label: 'This Month',
          range: () => ({
            startDate: startOfDay(startOfMonth(new Date())),
            endDate: endOfDay(endOfMonth(new Date()))
          })
        },
        {
          label: 'Last Month',
          range: () => {
            const start = startOfMonth(subMonths(new Date(), 1));
            const end = endOfMonth(subMonths(new Date(), 1));
            return {
              startDate: startOfDay(start),
              endDate: endOfDay(end)
            };
          }
        },
        {
          label: 'Last 90 Days',
          range: () => ({
            startDate: startOfDay(subDays(new Date(), 89)),
            endDate: endOfDay(new Date())
          })
        },
        {
          label: 'Last 12 Months',
          range: () => {
            const start = startOfMonth(subMonths(new Date(), 11));
            const end = endOfMonth(new Date());
            return {
              startDate: startOfDay(start),
              endDate: endOfDay(end)
            };
          }
        }
      ]);

      const dateBounds = getDateBounds(data, cols);

      return (
        <React.Fragment>
          <div id={`calender${String(sliceId)}`}>
            {showPresets ? (
              <DateRange
                minDate={new Date(dateBounds.minDate)}
                maxDate={new Date(dateBounds.maxDate)}
                startDatePlaceholder="Start Date"
                endDatePlaceholder="End Date"
                focusedRange={focusedRange}
                onRangeFocusChange={handleRangeFocusChange}
                onChange={item => {
                  const { selection } = item;
                  setFocusedRange([0, 1]);
                  
                  if (selection.endDate) {
                    setDateRange([{
                      startDate: selection.startDate,
                      endDate: selection.endDate,
                      key: 'selection'
                    }]);
                  } else {
                    setDateRange([{
                      startDate: selection.startDate,
                      endDate: selection.endDate,
                      key: 'selection',
                      autoFocus: false
                    }]);
                  }
                }}
                ranges={dateRange}
                rangeColors={['#808080', '#808080', '#808080']}
                weekStartsOn={weekStartsOn}
                staticRanges={definedRanges}
                shownDate={
                  dateRange[0].endDate !== 'Invalid Date' && new Date(dateRange[0].startDate)
                    ? dateRange[0].endDate
                    : new Date(dateBounds.maxDate)
                }
              />
            ) : (
              <DateRangePicker
                minDate={new Date(dateBounds.minDate)}
                maxDate={new Date(dateBounds.maxDate)}
                startDatePlaceholder="Start Date"
                endDatePlaceholder="End Date"
                focusedRange={focusedRange}
                onRangeFocusChange={handleRangeFocusChange}
                onChange={ranges => setDateRange([ranges.selection])}
                moveRangeOnFirstSelection={false}
                ranges={dateRange}
                rangeColors={['#808080', '#808080', '#808080']}
                weekStartsOn={weekStartsOn}
                shownDate={
                  dateRange[0].endDate !== 'Invalid Date' && new Date(dateRange[0].startDate)
                    ? dateRange[0].endDate
                    : new Date(dateBounds.maxDate)
                }
              />
            )}
            <div style={{ textAlign: 'end' }}>
              {showTimegrain ? (
                <TimeGrainSelect />
              ) : (
                <React.Fragment />
              )}
              <Button danger onClick={e => handleAction('Clear')}>
                Clear
              </Button>
              <Button
                type="primary"
                style={{ margin: '0px 10px' }}
                onClick={e => handleAction('Apply')}
              >
                Apply
              </Button>
            </div>
          </div>
        </React.Fragment>
      );
    }
  }

  // Modal state management
  const [showModal, setShowModal] = useState(false);
  
  const handleShowModal = () => {
    const button = document.getElementById('showTooltipButton' + sliceId);
    
    if (button && button) {
      const rect = button.getBoundingClientRect();
      const modalWidth = showPresets ? 610 : 380;
      const windowWidth = window.innerWidth;
      
      const positionRight = rect.left + 10;
      const positionLeft = rect.right - modalWidth - 10;
      
      if (windowWidth - rect.left >= modalWidth) {
        setModalPosition({
          left: positionRight,
          top: rect.top
        });
      } else {
        setModalPosition({
          left: positionLeft,
          top: rect.top
        });
      }
    }
    setShowModal(true);
  };

  // Button component
  class CalendarButton extends React.Component {
    constructor(props) {
      super(props);
      this.doSomethingBeforeRender();
    }

    doSomethingBeforeRender() {}

    render() {
      let buttonText;
      if (selectedRange[0].startDate && selectedRange[0].endDate) {
        buttonText = 
          moment(new Date(selectedRange[0].startDate)).format('MMM DD, YYYY') +
          ' - ' +
          moment(new Date(selectedRange[0].endDate)).format('MMM DD, YYYY');
      } else {
        buttonText = defaultButtonText || 'Select Dates';
      }

      const btnHeight = buttonHeight === 'auto' ? buttonHeight : buttonHeight + 'px';
      const btnWidth = 
        buttonWidth === 'auto' 
          ? buttonWidth 
          : buttonWidth.length === 0 
            ? '230px' 
            : buttonWidth + 'px';

      return (
        <React.Fragment>
          {status === 200 && true ? (
            <Button
              type="primary"
              icon={
                showCalenderIcon ? (
                  <CalendarOutlined />
                ) : (
                  <React.Fragment />
                )
              }
              id={'showTooltipButton' + sliceId}
              style={{
                margin: '10px 0px',
                padding: '4px 7px',
                height: btnHeight,
                width: btnWidth,
                textAlign: 'left'
              }}
              onClick={handleShowModal}
            >
              {buttonText}
            </Button>
          ) : (
            <React.Fragment />
          )}
        </React.Fragment>
      );
    }
  }

  // Handle native filter rendering
  if (showInNativeFilter) {
    const chartDiv = document.querySelector('.dashboard-chart-id-' + sliceId);

    if (filterBar) {
      const existingButton = document.getElementById('calenderButton' + sliceId);
      if (existingButton && existingButton.parentNode) {
        existingButton.parentNode.removeChild(existingButton);
      }

      const buttonContainer = document.createElement('div');
      buttonContainer.style.padding = '0px 15px';

      const label = document.createElement('h4');
      label.setAttribute('data-test', 'filter-control-name');
      label.style.color = '#323232';
      label.style.fontSize = '12px';
      label.style.margin = '0';
      label.style.overflowWrap = 'anywhere';
      label.textContent = showInNativeFilterLabel;

      buttonContainer.id = 'calenderButton' + sliceId;
      filterBar.prepend(buttonContainer);
      
      ReactDOM.render(<CalendarButton />, buttonContainer);
      buttonContainer.appendChild(label);

      chartDiv.style.display = 'block';
      if (chartDiv && HideonViewMode) {
        chartDiv.style.display = 'none';
      }
    } else if (chartDiv) {
      chartDiv.style.display = 'block';
    }
  }

  return (
    <React.Fragment>
      {showInNativeFilter && filterBar ? (
        <React.Fragment />
      ) : (
        <CalendarButton />
      )}
      <StyledModal
        className={'calender' + sliceId}
        title={null}
        footer={null}
        mask={false}
        visible={showModal}
        onOk={() => {
          setShowModal(false);
        }}
        onCancel={() => {
          setShowModal(false);
        }}
        style={{
          position: 'absolute',
          transition: 'opacity 0.3s',
          top: modalPosition.top + 'px',
          left: modalPosition.left + 'px',
          color: 'white',
          background: 'transparent',
          width: 'fit-content'
        }}
      >
        <CalendarWrapper>
          <CalendarModal />
        </CalendarWrapper>
      </StyledModal>
    </React.Fragment>
  );
}

// Plugin definition
class CalendarPickerChartPlugin extends ChartPlugin {
  constructor() {
    const metadata = new ChartMetadata({
      description: 'Calendar Picker',
      name: t('Calendar Picker'),
      behaviors: [Behavior.InteractiveChart],
      thumbnail: 'data:image/png;base64,...' // Base64 thumbnail data
    });

    super({
      buildQuery,
      controlPanel,
      loadChart: () => 
        Promise.resolve().then(() => require('./CalendarPicker')),
      metadata,
      transformProps
    });
  }
}

export default CalendarPickerChartPlugin;