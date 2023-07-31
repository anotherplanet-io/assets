from jinja2 import Environment, FileSystemLoader
from tabulate import tabulate

# Load the README.md template
env = Environment(loader=FileSystemLoader("."))
template = env.get_template("scripts/README_template.md")

# Define the dynamic content (replace these with your actual content)
table_of_contents = "1. Introduction\n2. Usage\n3. Example"
features = ["Feature 1", "Feature 2", "Feature 3"]
custom_section = "Additional information and notes."

# Sample array of objects (replace this with your actual data)
data = [
    {"Name": "John", "Age": 30, "Country": "USA"},
    {"Name": "Alice", "Age": 25, "Country": "Canada"},
    {"Name": "Bob", "Age": 22, "Country": "UK"},
]

# Convert the array of objects to a list of lists
table_data = [[obj["Name"], obj["Age"], obj["Country"]] for obj in data]

# List of column headers
headers = ["Name", "Age", "Country"]

# Generate the Markdown table using tabulate
table = tabulate(table_data, headers, tablefmt="pipe")


# Render the template with the dynamic content
readme_content = template.render(
    table_of_contents=table_of_contents,
    feature1=features[0],
    feature2=features[1],
    custom_section=custom_section,
    table=table,
)

# Save the rendered content to README.md
with open("README.md", "w") as readme_file:
    readme_file.write(readme_content)

print("README.md generated successfully.")

