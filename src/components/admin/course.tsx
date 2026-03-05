import { TCourse } from "../../lib/definitions";

const Course = (props: { course: TCourse }) => {
  return (
    <tr class='odd:bg-neutral-700 even:bg-neutral-900 border-b '>
      <th
        scope='row'
        class='px-6 py-4 font-medium text-heading whitespace-nowrap'
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
          href={`/course_editor/${props.course.id}`}
          class='font-medium text-fg-brand hover:underline'
        >
          Edit
        </a>
      </td>
    </tr>
  );
};

export default Course;
