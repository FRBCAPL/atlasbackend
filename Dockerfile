FROM selenium/standalone-chrome:latest

USER root
WORKDIR /app

# Install Python and pip
RUN apt-get update && apt-get install -y python3 python3-pip

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python3", "scrape_schedule.py"]
