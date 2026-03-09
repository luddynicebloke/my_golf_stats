import { TCourse } from "../../lib/definitions";

const Course = (props: { course: TCourse }) => {
  return (
    <tr class='border-b border-slate-200 odd:bg-white even:bg-slate-50'>
      <th
        scope='row'
        class='whitespace-nowrap px-6 py-4 font-medium text-slate-700'
      >
        {props.course.id}
      </th>
      <td class='px-6 py-4'>{props.course.name}</td>
      <td class='px-6 py-4'>
        {new Date(props.course.created_at).toLocaleDateString()}
      </td>
      <td class='px-6 py-4'>{props.course.city}</td>
      <td class='px-6 py-4'>{props.course.country}</td>
      <td class='px-6 py-4'>
        <a
          href={`/admin/course_editor/${props.course.id}`}
          class='font-medium text-cyan-700 hover:text-cyan-800 hover:underline'
        >
          Edit
        </a>
      </td>
    </tr>
  );
};

export default Course;
