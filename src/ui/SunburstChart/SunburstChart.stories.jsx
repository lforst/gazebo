import data from './data'
import SunburstChart from './SunburstChart'

const Template = (args) => (
  <div className="mx-auto w-[40%]">
    <SunburstChart {...args} />
  </div>
)

export const NormalSunburstChart = {
  render: Template,

  args: {
    data: data,
    svgFontSize: '16px',
    svgRenderSize: 964,
  },
}

export default {
  title: 'Components/SunburstChart',
  component: SunburstChart,
  argTypes: { onClick: { action: 'clicked' } },
}
